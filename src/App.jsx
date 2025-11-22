import React, { useState, useEffect } from 'react';
import { 
  Calendar, User, PieChart, LogOut, 
  Plus, ChevronLeft, ChevronRight, Search, Menu, X
} from 'lucide-react';
import { 
  collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs 
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Imports Modulares
import { db, auth, appId } from './utils/firebase';
import { formatDateBR } from './utils/calculations';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import BookingCard from './components/BookingCard';
import BookingModal from './components/BookingModal';
import FinancialPanel from './components/FinancialPanel';
import ClientList from './components/ClientList';
import InstallButton from './components/InstallButton'; // <--- Botão de Instalar

export default function DogHotelApp() {
  // --- ESTADOS DE UI E AUTH ---
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('agenda');
  const [userName, setUserName] = useState('Recepcionista');

  // --- ESTADOS DA AGENDA ---
  const [view, setView] = useState('day'); // 'day', 'week', 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // --- ESTADOS DE DADOS ---
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [races, setRaces] = useState([]);

  // --- ESTADOS DE CONTROLE (MENU/MODAL) ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [modalMode, setModalMode] = useState('booking');

  // --- EFEITOS (AUTH E DATA) ---
  useEffect(() => {
    const initAuth = async () => {
        try { await signInAnonymously(auth); } catch (e) { console.error("Auth fail", e); }
    };
    initAuth();
    return onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if(u) {
            setIsAuthenticated(true);
            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'logins'), where("email", "==", "lyoni.berbert@gmail.com"));
            const snap = await getDocs(q);
            if (!snap.empty && snap.docs[0].data().name) setUserName(snap.docs[0].data().name);
        }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubClients = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), 
        (snap) => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubBookings = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), 
        (snap) => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubRaces = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'races'), 
        (snap) => setRaces(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubClients(); unsubBookings(); unsubRaces(); };
  }, [user]);

  // --- HELPERS DE DATA E LÓGICA ---
  const startOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };
  
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() + direction);
    if (view === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
    if (view === 'month') newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getBookingsForDate = (date) => {
      const startOfDay = new Date(date).setHours(0,0,0,0);
      const endOfDay = new Date(date).setHours(23,59,59,999);
      
      return bookings.map(b => {
          const client = clients.find(c => c.id === b.clientId);
          return { ...b, clientPhoto: client?.photos?.[0] };
      }).filter(b => {
          if(!b.checkIn || !b.checkOut) return false;
          const start = new Date(b.checkIn).getTime();
          const end = new Date(b.checkOut).getTime();
          return (start <= endOfDay && end >= startOfDay); 
      });
  };

  // --- ACTIONS (CRUD) ---
  const handleSave = async (formData) => {
      if (!user) return alert("Erro: Sem conexão.");
      const isNewClient = !formData.clientId;
      const isBooking = modalMode === 'booking';
      const isEditingBooking = isBooking && formData.id;

      if (isNewClient && (modalMode === 'client_new' || isBooking)) {
          const dogName = (formData.dogName || '').trim().toLowerCase();
          const w1 = (formData.whatsapp || '').replace(/\D/g, '').trim();
          const w2 = (formData.whatsapp2 || '').replace(/\D/g, '').trim();
          const isDuplicate = clients.some(c => {
              const cName = (c.dogName || '').trim().toLowerCase();
              if (cName !== dogName) return false;
              const cw1 = (c.whatsapp || '').replace(/\D/g, '').trim();
              const cw2 = (c.whatsapp2 || '').replace(/\D/g, '').trim();
              return (w1 && (w1===cw1 || w1===cw2)) || (w2 && (w2===cw1 || w2===cw2));
          });
          if (isDuplicate) return alert(`ERRO: Já existe um pet "${formData.dogName}" vinculado a este WhatsApp.`);
      }

      try {
          let clientId = formData.clientId;
          const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
          const existingClient = !clientId 
             ? clients.find(c => c.dogName.toLowerCase() === formData.dogName.toLowerCase() && c.ownerName.toLowerCase() === formData.ownerName.toLowerCase())
             : clients.find(c => c.id === clientId);

          const clientDataToSave = {
            dogName: formData.dogName, dogSize: formData.dogSize, dogBreed: formData.dogBreed, source: formData.source,
            ownerName: formData.ownerName, ownerName2: formData.ownerName2, 
            whatsapp: formData.whatsapp, whatsapp2: formData.whatsapp2,
            ownerEmail: formData.ownerEmail, ownerDoc: formData.ownerDoc, address: formData.address, birthYear: formData.birthYear,
            history: formData.history, ownerHistory: formData.ownerHistory, ownerRating: formData.ownerRating,
            restrictions: formData.restrictions, socialization: formData.socialization, medications: formData.medications,
            photos: formData.photos, vaccineDocs: formData.vaccineDocs, vaccines: formData.vaccines,
            lastAntiRabica: formData.lastAntiRabica, lastMultipla: formData.lastMultipla,
            dogBehaviorRating: formData.dogBehaviorRating
          };

          let bookingSummary = null;
          if (isBooking) {
              bookingSummary = {
                  id: isEditingBooking ? formData.id + '_hist' : Date.now() + '_hist',
                  checkIn: formData.checkIn, checkOut: formData.checkOut,
                  observation: 'Hospedagem', rating: formData.rating, 
                  dogBehaviorRating: formData.dogBehaviorRating, ownerRating: formData.ownerRating,
                  dailyRate: parseFloat(formData.dailyRate)||0, 
                  totalValue: parseFloat(formData.totalValue)||0,
                  damageValue: parseFloat(formData.damageValue)||0, damageDescription: formData.damageDescription||''
              };
          }

          let clientToUpdate = existingClient;
          if (clientToUpdate) {
              clientId = clientToUpdate.id;
              const clientDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientId);
              let newPastBookings = clientToUpdate.pastBookings || [];
              if (bookingSummary) {
                  newPastBookings = newPastBookings.filter(h => !(h.checkIn === bookingSummary.checkIn && h.checkOut === bookingSummary.checkOut));
                  newPastBookings = [bookingSummary, ...newPastBookings];
              }
              await updateDoc(clientDocRef, { ...clientDataToSave, pastBookings: newPastBookings });
          } else {
              const newClientData = { ...clientDataToSave, pastBookings: bookingSummary ? [bookingSummary] : [] };
              const docRef = await addDoc(clientsRef, newClientData);
              clientId = docRef.id;
              clientToUpdate = { id: clientId, ...newClientData };
          }

          if (isBooking) {
              const bookingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
              const bookingData = { ...formData, clientId: clientId };
              if (editingData && editingData.id) {
                  await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', editingData.id), bookingData);
              } else {
                  await addDoc(bookingsRef, bookingData);
              }
          }

          // Limpeza de histórico duplicado (se houver)
          if (clientToUpdate) {
              const history = clientToUpdate.pastBookings || [];
              if (history.length > 1) {
                  const uniqueMap = history.reduce((acc, hist) => {
                      if (!hist.checkIn || !hist.checkOut) return acc;
                      const key = `${hist.checkIn}-${hist.checkOut}`;
                      if (!acc[key] || hist.id < acc[key].id) acc[key] = hist; 
                      return acc;
                  }, {});
                  const cleaned = Object.values(uniqueMap).sort((a, b) => b.id - a.id);
                  if (cleaned.length !== history.length) {
                      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientToUpdate.id), { pastBookings: cleaned });
                  }
              }
          }

          setIsModalOpen(false); setEditingData(null);
      } catch (error) {
          console.error(error);
          alert(`Erro ao salvar: ${error.message}`);
      }
  };

  const handleDeleteBooking = async (id) => {
      if(window.prompt("Digite 'DELETAR' para confirmar:") === 'DELETAR') {
          const bk = bookings.find(b => b.id === id);
          if (bk && bk.clientId) {
              const client = clients.find(c => c.id === bk.clientId);
              if (client) {
                  const newHistory = (client.pastBookings||[]).filter(h => !(h.checkIn === bk.checkIn && h.checkOut === bk.checkOut));
                  await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', bk.clientId), { pastBookings: newHistory });
              }
          }
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id));
      }
  };

  const handleMobileNav = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // --- RENDERIZADORES DA AGENDA ---
  const renderWeekView = () => {
    const start = startOfWeek(currentDate);
    const weekDays = Array.from({length: 7}, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <div className="w-full overflow-x-auto pb-4">
        <div className="grid grid-cols-7 gap-2 min-w-[800px]">
           {weekDays.map((day, idx) => {
             const dayBookings = getBookingsForDate(day);
             const isToday = day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth();
             return (
               <div key={idx} className={`border rounded-lg flex flex-col h-[500px] ${isToday ? 'bg-[#0000FF]/5 border-[#0000FF]/20' : 'bg-white'}`}>
                 <div className={`p-2 text-center border-b font-medium ${isToday ? 'text-[#0000FF]' : 'text-gray-600'}`}>
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' })} <br/>
                    <span className="text-sm text-gray-500">{day.getDate()}/{day.getMonth()+1}</span>
                 </div>
                 <div className="flex-1 p-1 overflow-y-auto space-y-2 scrollbar-thin">
                    {dayBookings.map(b => (
                      <div key={b.id} onClick={() => {setEditingData(b); setModalMode('booking'); setIsModalOpen(true);}} className="p-2 bg-white border-l-4 border-l-[#0000FF] rounded shadow-sm text-xs cursor-pointer hover:bg-blue-50 transition border border-gray-100">
                        <div className="font-bold truncate">{b.dogName}</div>
                      </div>
                    ))}
                 </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days = [...Array(firstDayOfMonth).fill(null), ...Array(daysInMonth).keys().map(i => new Date(year, month, i + 1))];

    return (
      <div className="w-full overflow-x-auto pb-4">
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden min-w-[800px]">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="bg-gray-100 p-2 text-center font-semibold text-sm text-gray-600">{d}</div>
            ))}
            {days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="bg-white h-32"></div>;
                const dayBookings = getBookingsForDate(day);
                const isToday = day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth();
                return (
                    <div key={idx} className={`bg-white h-32 p-1 flex flex-col hover:bg-gray-50 transition ${isToday ? 'bg-blue-50' : ''}`}>
                        <span className={`text-sm font-medium mb-1 self-end px-1.5 rounded ${isToday ? 'bg-[#0000FF] text-white' : 'text-gray-700'}`}>{day.getDate()}</span>
                        <div className="flex-1 overflow-y-auto space-y-1">
                            {dayBookings.slice(0, 3).map(b => (
                                <div key={b.id} onClick={() => {setEditingData(b); setModalMode('booking'); setIsModalOpen(true);}} className="text-xs truncate bg-blue-100 text-blue-800 px-1 rounded cursor-pointer hover:bg-blue-200">
                                    {b.dogName}
                                </div>
                            ))}
                            {dayBookings.length > 3 && <div className="text-xs text-gray-400 text-center">+{dayBookings.length - 3} mais</div>}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    );
  };

  // --- RENDERIZAÇÃO PRINCIPAL ---
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} db={db} appId={appId} isDbReady={!!user} />;

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-64 bg-[#000099] text-white flex-col shadow-xl z-20">
        {/* --- LOGO E TÍTULO --- */}
        <div className="p-6 flex items-center gap-3 border-b border-[#0000CC]">
            <div className="shrink-0 bg-white rounded-full p-1">
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-10 h-10 object-contain" 
                />
            </div>
            <div>
                <h1 className="font-bold text-lg leading-none tracking-wide">Uma Casa Boa</h1>
                <p className="text-xs font-medium opacity-80 leading-tight uppercase tracking-widest mt-1">Pra Cachorro</p>
            </div>
        </div>
        
        <nav className="flex-1 py-6 space-y-2 px-3">
            <button onClick={() => setActiveTab('agenda')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'agenda' ? 'bg-[#0000CC] shadow' : 'hover:bg-[#0000CC]'}`}><Calendar size={20}/> Agenda</button>
            <button onClick={() => setActiveTab('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'clients' ? 'bg-[#0000CC] shadow' : 'hover:bg-[#0000CC]'}`}><User size={20}/> Cadastros</button>
            <button onClick={() => setActiveTab('financial')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'financial' ? 'bg-[#0000CC] shadow' : 'hover:bg-[#0000CC]'}`}><PieChart size={20}/> Financeiro</button>
        </nav>
        
        {/* BOTÃO DE INSTALAR NO DESKTOP */}
        <div className="px-3 pb-2">
            <InstallButton />
        </div>

        <div className="p-4 border-t border-[#0000CC]"><button onClick={() => {if(confirm("Sair?")) setIsAuthenticated(false)}} className="w-full flex gap-2 text-gray-300 hover:text-white"><LogOut size={16}/> Sair</button></div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* HEADER */}
        <header className="bg-white shadow-sm h-16 flex items-center px-4 md:px-6 justify-between z-30 relative">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none">
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                
                <h2 className="text-xl font-bold text-gray-700 hidden md:block">{activeTab === 'agenda' ? 'Agenda' : activeTab === 'clients' ? 'Gerenciamento de Clientes' : 'Financeiro'}</h2>

                {/* --- LOGO E TÍTULO MOBILE --- */}
                <div className="flex items-center gap-2 md:hidden">
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className="w-9 h-9 object-contain" 
                    />
                    <div>
                        <h2 className="font-bold text-[#000099] leading-none text-[15px]">Uma Casa Boa</h2>
                        <p className="font-bold text-[#000099]/70 leading-none text-[10px] uppercase tracking-wider">Pra Cachorro</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 hidden md:block">Olá, {userName}</span>
                <button onClick={() => {setEditingData(null); setModalMode('booking'); setIsModalOpen(true);}} className="bg-[#0000FF] text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold flex items-center gap-2 shadow hover:bg-[#0000AA] text-sm md:text-base">
                    <Plus size={20}/> <span className="hidden sm:inline">Nova Reserva</span><span className="sm:hidden">Nova</span>
                </button>
            </div>
        </header>

        {/* MENU MOBILE DESLIZANTE */}
        {isMobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 w-full bg-white shadow-xl border-t border-gray-100 z-20 animate-fade-in flex flex-col p-2">
                <button onClick={() => handleMobileNav('agenda')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'agenda' ? 'bg-blue-50 text-[#0000FF]' : 'text-gray-700 hover:bg-gray-50'}`}><Calendar size={20}/> Agenda</button>
                <button onClick={() => handleMobileNav('clients')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'clients' ? 'bg-blue-50 text-[#0000FF]' : 'text-gray-700 hover:bg-gray-50'}`}><User size={20}/> Cadastros</button>
                <button onClick={() => handleMobileNav('financial')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'financial' ? 'bg-blue-50 text-[#0000FF]' : 'text-gray-700 hover:bg-gray-50'}`}><PieChart size={20}/> Financeiro</button>
                
                <div className="h-px bg-gray-100 my-2"></div>
                
                {/* BOTÃO DE INSTALAR NO MOBILE */}
                <div className="px-2 mb-2">
                    <InstallButton />
                </div>

                <button onClick={() => {if(confirm("Sair do sistema?")) setIsAuthenticated(false)}} className="flex items-center gap-3 p-4 rounded-lg font-medium text-red-600 hover:bg-red-50"><LogOut size={20}/> Sair</button>
            </div>
        )}

        {/* ÁREA DE CONTEÚDO COM SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-100">
            {isMobileMenuOpen && <div className="md:hidden fixed inset-0 bg-black/20 z-10 top-16" onClick={() => setIsMobileMenuOpen(false)}></div>}

            {activeTab === 'agenda' && (
                <div className="space-y-6">
                    {/* Controles de Data e Visão */}
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
                        <div className="flex bg-gray-100 p-1 rounded-lg w-full lg:w-auto">
                            {['day', 'week', 'month'].map(v => (
                                <button 
                                    key={v} 
                                    onClick={() => setView(v)} 
                                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-sm font-medium transition ${view === v ? 'bg-white shadow text-[#0000FF]' : 'text-gray-600'}`}
                                >
                                    {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
                            <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft/></button>
                            <h3 className="text-lg font-bold text-[#0000FF] capitalize text-center w-48">
                                {view === 'day' && formatDateBR(currentDate)}
                                {view === 'month' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                {view === 'week' && `Semana de ${startOfWeek(currentDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}`}
                            </h3>
                            <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight/></button>
                        </div>
                    </div>

                    {/* Renderização da Visão */}
                    {view === 'day' && (
                        getBookingsForDate(currentDate).length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">Nenhuma hospedagem para este dia.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {getBookingsForDate(currentDate).map(b => (
                                    <BookingCard key={b.id} booking={b} onEdit={() => {setEditingData(b); setModalMode('booking'); setIsModalOpen(true);}} onDelete={() => handleDeleteBooking(b.id)} />
                                ))}
                            </div>
                        )
                    )}
                    {view === 'week' && renderWeekView()}
                    {view === 'month' && renderMonthView()}
                </div>
            )}
            
            {activeTab === 'clients' && <ClientList clients={clients} onEdit={(c) => {setEditingData(c); setModalMode(c ? 'client_edit' : 'client_new'); setIsModalOpen(true);}} onDelete={(id) => {if(confirm("Deletar cliente?")) deleteDoc(doc(db,'artifacts',appId,'public','data','clients',id))}} />}
            {activeTab === 'financial' && <FinancialPanel bookings={bookings.map(b => ({...b, clientName: clients.find(c=>c.id===b.clientId)?.dogName}))} />}
        </div>

      </main>

      {isModalOpen && (
          <BookingModal 
            data={editingData} 
            mode={modalMode} 
            clientDatabase={clients} 
            onSave={handleSave} 
            onClose={() => setIsModalOpen(false)}
            races={races} 
            onAddRace={(name) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'races'), { name })}
          />
      )}
    </div>
  );
}