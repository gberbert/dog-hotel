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
// Removemos o import do AppIcon

export default function DogHotelApp() {
  // --- ESTADOS ---
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('agenda');
  const [userName, setUserName] = useState('Recepcionista');
  const [view, setView] = useState('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [races, setRaces] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [modalMode, setModalMode] = useState('booking');

  // --- AUTH & DATA ---
  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) { console.error(e); } };
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
    const unsubClients = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), (s) => setClients(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubBookings = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), (s) => setBookings(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubRaces = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'races'), (s) => setRaces(s.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsubClients(); unsubBookings(); unsubRaces(); };
  }, [user]);

  // --- HELPERS ---
  const startOfWeek = (d) => { const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day; return new Date(date.setDate(diff)); };
  const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const navigateDate = (dir) => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() + dir);
    if (view === 'week') newDate.setDate(newDate.getDate() + (dir * 7));
    if (view === 'month') newDate.setMonth(newDate.getMonth() + dir);
    setCurrentDate(newDate);
  };
  const getBookingsForDate = (date) => {
      const start = new Date(date).setHours(0,0,0,0);
      const end = new Date(date).setHours(23,59,59,999);
      return bookings.map(b => ({...b, clientPhoto: clients.find(c => c.id === b.clientId)?.photos?.[0]})).filter(b => {
          if(!b.checkIn || !b.checkOut) return false;
          return (new Date(b.checkIn).getTime() <= end && new Date(b.checkOut).getTime() >= start); 
      });
  };
  const handleSave = async (formData) => {
      if (!user) return alert("Sem conexão.");
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
          const existingClient = !clientId ? clients.find(c => c.dogName.toLowerCase() === formData.dogName.toLowerCase()) : clients.find(c => c.id === clientId);

          const clientData = {
            dogName: formData.dogName, dogSize: formData.dogSize, dogBreed: formData.dogBreed, source: formData.source,
            ownerName: formData.ownerName, ownerName2: formData.ownerName2, whatsapp: formData.whatsapp, whatsapp2: formData.whatsapp2,
            ownerEmail: formData.ownerEmail, ownerDoc: formData.ownerDoc, address: formData.address, birthYear: formData.birthYear,
            history: formData.history, ownerHistory: formData.ownerHistory, ownerRating: formData.ownerRating,
            restrictions: formData.restrictions, socialization: formData.socialization, medications: formData.medications,
            photos: formData.photos, vaccineDocs: formData.vaccineDocs, vaccines: formData.vaccines,
            lastAntiRabica: formData.lastAntiRabica, lastMultipla: formData.lastMultipla, dogBehaviorRating: formData.dogBehaviorRating
          };

          let bookingSummary = null;
          if (isBooking) {
              bookingSummary = {
                  id: isEditingBooking ? formData.id + '_hist' : Date.now() + '_hist',
                  checkIn: formData.checkIn, checkOut: formData.checkOut, observation: 'Hospedagem', rating: formData.rating, 
                  dogBehaviorRating: formData.dogBehaviorRating, ownerRating: formData.ownerRating,
                  dailyRate: parseFloat(formData.dailyRate)||0, totalValue: parseFloat(formData.totalValue)||0,
                  damageValue: parseFloat(formData.damageValue)||0, damageDescription: formData.damageDescription||''
              };
          }

          let clientToUpdate = existingClient;
          if (clientToUpdate) {
              clientId = clientToUpdate.id;
              const cRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientId);
              let newHistory = clientToUpdate.pastBookings || [];
              if (bookingSummary) {
                  newHistory = newHistory.filter(h => !(h.checkIn === bookingSummary.checkIn && h.checkOut === bookingSummary.checkOut));
                  newHistory = [bookingSummary, ...newHistory];
              }
              await updateDoc(cRef, { ...clientData, pastBookings: newHistory });
          } else {
              const docRef = await addDoc(clientsRef, { ...clientData, pastBookings: bookingSummary ? [bookingSummary] : [] });
              clientId = docRef.id;
          }

          if (isBooking) {
              const bRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
              const bData = { ...formData, clientId: clientId };
              if (editingData && editingData.id) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', editingData.id), bData);
              else await addDoc(bRef, bData);
          }
          setIsModalOpen(false); setEditingData(null);
      } catch (e) { alert(e.message); }
  };

  const handleDeleteBooking = async (id) => {
      if(window.prompt("Digite 'DELETAR':") === 'DELETAR') {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id));
      }
  };

  // --- RENDERIZADORES ---
  const renderWeekView = () => {
    const start = startOfWeek(currentDate);
    const days = Array.from({length: 7}, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    return (
      <div className="w-full overflow-x-auto pb-4">
        <div className="grid grid-cols-7 gap-2 min-w-[800px]">
           {days.map((day, i) => (
               <div key={i} className={`border rounded-lg flex flex-col h-[500px] ${day.getDate()===new Date().getDate() ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                 <div className="p-2 text-center border-b font-medium text-gray-600">{day.toLocaleDateString('pt-BR', {weekday:'short'})} <br/><span className="text-sm">{day.getDate()}/{day.getMonth()+1}</span></div>
                 <div className="flex-1 p-1 overflow-y-auto space-y-2 scrollbar-thin">
                    {getBookingsForDate(day).map(b => (
                      <div key={b.id} onClick={() => {setEditingData(b); setModalMode('booking'); setIsModalOpen(true);}} className="p-2 bg-white border-l-4 border-l-blue-600 rounded shadow-sm text-xs cursor-pointer hover:bg-blue-50 border border-gray-100">
                        <div className="font-bold truncate">{b.dogName}</div>
                      </div>
                    ))}
                 </div>
               </div>
           ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const days = [...Array(new Date(y, m, 1).getDay()).fill(null), ...Array(new Date(y, m+1, 0).getDate()).keys().map(i => new Date(y, m, i+1))];
    return (
      <div className="w-full overflow-x-auto pb-4">
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden min-w-[800px]">
            {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="bg-gray-100 p-2 text-center font-bold text-gray-600">{d}</div>)}
            {days.map((day, i) => (
                !day ? <div key={i} className="bg-white h-32"></div> :
                <div key={i} className={`bg-white h-32 p-1 flex flex-col hover:bg-gray-50 ${day.getDate()===new Date().getDate() && day.getMonth()===new Date().getMonth() ? 'bg-blue-50' : ''}`}>
                    <span className="text-sm font-medium self-end px-1">{day.getDate()}</span>
                    <div className="flex-1 overflow-y-auto space-y-1">
                        {getBookingsForDate(day).slice(0,3).map(b => <div key={b.id} onClick={() => {setEditingData(b); setModalMode('booking'); setIsModalOpen(true);}} className="text-xs truncate bg-blue-100 text-blue-800 px-1 rounded cursor-pointer">{b.dogName}</div>)}
                        {getBookingsForDate(day).length > 3 && <div className="text-xs text-gray-400 text-center">+{getBookingsForDate(day).length - 3}</div>}
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  };

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} db={db} appId={appId} isDbReady={!!user} />;

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-64 bg-[#000099] text-white flex-col shadow-xl z-20">
        {/* --- LOGO E TÍTULO (IMAGEM PNG) --- */}
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

                {/* --- LOGO E TÍTULO MOBILE (IMAGEM PNG) --- */}
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

        {/* MENU MOBILE */}
        {isMobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 w-full bg-white shadow-xl border-t border-gray-100 z-20 animate-fade-in flex flex-col p-2">
                <button onClick={() => {setActiveTab('agenda'); setIsMobileMenuOpen(false);}} className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 font-medium text-gray-700"><Calendar size={20}/> Agenda</button>
                <button onClick={() => {setActiveTab('clients'); setIsMobileMenuOpen(false);}} className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 font-medium text-gray-700"><User size={20}/> Cadastros</button>
                <button onClick={() => {setActiveTab('financial'); setIsMobileMenuOpen(false);}} className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 font-medium text-gray-700"><PieChart size={20}/> Financeiro</button>
                <div className="h-px bg-gray-100 my-2"></div>
                <button onClick={() => {if(confirm("Sair?")) setIsAuthenticated(false)}} className="flex items-center gap-3 p-4 rounded-lg font-medium text-red-600 hover:bg-red-50"><LogOut size={20}/> Sair</button>
            </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-100">
            {isMobileMenuOpen && <div className="md:hidden fixed inset-0 bg-black/20 z-10 top-16" onClick={() => setIsMobileMenuOpen(false)}></div>}

            {activeTab === 'agenda' && (
                <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
                        <div className="flex bg-gray-100 p-1 rounded-lg w-full lg:w-auto">
                            {['day', 'week', 'month'].map(v => <button key={v} onClick={() => setView(v)} className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-sm font-medium transition ${view === v ? 'bg-white shadow text-[#0000FF]' : 'text-gray-600'}`}>{v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}</button>)}
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
                    {view === 'day' && (
                        getBookingsForDate(currentDate).length === 0 ? <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">Nenhuma hospedagem.</div> :
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {getBookingsForDate(currentDate).map(b => <BookingCard key={b.id} booking={b} onEdit={() => {setEditingData(b); setModalMode('booking'); setIsModalOpen(true);}} onDelete={() => handleDeleteBooking(b.id)} />)}
                        </div>
                    )}
                    {view === 'week' && renderWeekView()}
                    {view === 'month' && renderMonthView()}
                </div>
            )}
            
            {activeTab === 'clients' && <ClientList clients={clients} onEdit={(c) => {setEditingData(c); setModalMode(c ? 'client_edit' : 'client_new'); setIsModalOpen(true);}} onDelete={(id) => {if(confirm("Deletar?")) deleteDoc(doc(db,'artifacts',appId,'public','data','clients',id))}} />}
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