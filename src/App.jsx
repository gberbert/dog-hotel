import React, { useState, useEffect } from 'react';
import {
  Calendar, User, PieChart, LogOut, Home,
  Plus, ChevronLeft, ChevronRight, Search, Menu, X, PawPrint, Shield, Inbox
} from 'lucide-react';
import {
  collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs, getDoc
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Imports Modulares
import { db, auth, appId } from './utils/firebase.js';
import { formatDateBR, isVaccineExpired, getCapacityInfoForDate } from './utils/calculations.js';
import SplashScreen from './components/SplashScreen.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import BookingCard from './components/BookingCard.jsx';
import BookingModal from './components/BookingModal.jsx';
import FinancialPanel from './components/FinancialPanel.jsx';
import ClientList from './components/ClientList.jsx';
import InstallButton from './components/InstallButton.jsx';
import UpcomingBookings from './components/UpcomingBookings.jsx';
import BreedIdentifier from './components/BreedIdentifier.jsx';
import ConfirmationModal from './components/shared/ConfirmationModal.jsx';
import NotificationManager from './components/shared/NotificationManager.jsx';
import NotificationBell from './components/shared/NotificationBell.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import MyProfile from './components/MyProfile.jsx';
import ClientBookingModal from './components/ClientBookingModal.jsx';
import BookingRequestsPanel from './components/BookingRequestsPanel.jsx';
import ClientRequestsPanel from './components/ClientRequestsPanel.jsx';

// Import da Versão
import { appVersion } from './version.js';

// Import do Contexto
import { DataProvider } from './context/DataContext.jsx';

export default function DogHotelApp() {
  // --- ESTADOS ---
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('user');

  // Aba padrão
  const [activeTab, setActiveTab] = useState('agenda');

  const [userName, setUserName] = useState('Usuário');
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Estados locais
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [races, setRaces] = useState([]);
  const [maxCapacity, setMaxCapacity] = useState(6);
  const [capacityOverrides, setCapacityOverrides] = useState([]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientBookingModalOpen, setIsClientBookingModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [modalMode, setModalMode] = useState('booking');

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Estado para confirmação de deleção
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, bookingId: null });

  // --- EFEITOS ---
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        if (!u.emailVerified) {
          await signOut(auth);
          setUser(null);
          setIsAuthenticated(false);
          setUserRole('user');
          return;
        }

        setUser(u);
        setIsAuthenticated(true);
        try {
          const roleDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_roles', u.uid));
          if (roleDoc.exists()) {
            const data = roleDoc.data();
            setUserName(data.name || u.email);
            setUserRole(data.role || (u.email === 'lyoni.berbert@gmail.com' ? 'admin' : 'user'));
            if (data.role !== 'admin' && u.email !== 'lyoni.berbert@gmail.com') setActiveTab('agenda');
          } else {
            setUserName(u.email);
            const defaultRole = u.email === 'lyoni.berbert@gmail.com' ? 'admin' : 'user';
            setUserRole(defaultRole);
            if (defaultRole !== 'admin') setActiveTab('agenda');
          }
        } catch (e) {
          console.error("Erro ao buscar perfil:", e);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setUserRole('user');
      }
    });
  }, []);

  useEffect(() => {
    // Captura o param de link de convite
    const urlParams = new URLSearchParams(window.location.search);
    const vincularId = urlParams.get('vincular');
    if (vincularId) {
      localStorage.setItem('doghotel_vincular_id', vincularId);
      // Limpa a URL sem dar refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const unsubClients = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubBookings = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), (s) => setBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubRaces = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'races'), (s) => setRaces(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), (d) => {
        if(d.exists()) {
          const data = d.data();
          setMaxCapacity(data.maxCapacity || 6);
          setCapacityOverrides(data.capacityOverrides || []);
        }
      });
      return () => { unsubClients(); unsubBookings(); unsubRaces(); unsubSettings(); };
    }
  }, [user]);

  // Scroll para o dia atual na visualização mensal
  useEffect(() => {
    if (activeTab === 'agenda' && view === 'month') {
      setTimeout(() => {
        const el = document.getElementById('today-cell');
        if (el) {
          // Remover 'behavior: smooth' para garantir compatibilidade com iOS Safari em containers horizontais
          el.scrollIntoView({ block: 'center', inline: 'center' });
        }
      }, 100); // Reduzir o delay para ser mais instantâneo
    }
  }, [activeTab, view, currentDate]);

  // --- HELPERS ---
  const startOfWeek = (d) => {
    const date = new Date(d); const day = date.getDay();
    const diff = date.getDate() - day; return new Date(date.setDate(diff));
  };

  const navigateDate = (dir) => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() + dir);
    if (view === 'week') newDate.setDate(newDate.getDate() + (dir * 7));
    if (view === 'month') newDate.setMonth(newDate.getMonth() + dir);
    setCurrentDate(newDate);
  };

  const getBookingsForDate = (date) => {
    const start = new Date(date).setHours(0, 0, 0, 0);
    const end = new Date(date).setHours(23, 59, 59, 999);
    return bookings.map(b => {
      const client = clients.find(c => c.id === b.clientId);
      return {
        ...b,
        clientPhoto: client?.photos?.[0],
        clientDogBehaviorRating: client?.dogBehaviorRating,
        source: client?.source || b.source || 'Particular',
        lastAntiRabica: client?.lastAntiRabica,
        lastMultipla: client?.lastMultipla
      };
    }).filter(b => {
      if (!b.checkIn || !b.checkOut) return false;
      return (new Date(b.checkIn).getTime() <= end && new Date(b.checkOut).getTime() >= start);
    });
  };

  const handleSave = async (formData) => {
    if (!user) return alert("Sem conexão.");
    const isBooking = modalMode === 'booking' || modalMode === 'booking_request';
    const isEditingBooking = isBooking && editingData?.id && modalMode !== 'booking_request';

    // --- Validação de Vacina (Feature Nova) ---
    if (isVaccineExpired(formData.lastAntiRabica) || isVaccineExpired(formData.lastMultipla)) {
      if (!confirm("⚠️ ATENÇÃO: Há vacinas vencidas (> 1 ano). Deseja realmente salvar este registro?")) return;
    }

    try {
      let clientId = formData.clientId;
      const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');

      // --- Correção de Duplicidade: Chave Composta (Pet + Tutor) ---
      // Se não temos ID, buscamos match EXATO de (Pet + Tutor) para evitar sobrescrever pets com mesmo nome de tutores diferentes
      let existingClient = clientId ? clients.find(c => c.id === clientId) : null;

      if (!existingClient) {
        const inputDog = (formData.dogName || '').trim().toLowerCase();
        const inputOwner = (formData.ownerName || '').trim().toLowerCase();
        const inputW1 = (formData.whatsapp || '').replace(/\D/g, '').trim();

        existingClient = clients.find(c => {
          const dbDog = (c.dogName || '').trim().toLowerCase();
          if (dbDog !== inputDog) return false; // Nome do cão diferente -> Não é o mesmo

          // Se nome do cão é igual, verifica o tutor
          const dbOwner = (c.ownerName || '').trim().toLowerCase();
          const dbW1 = (c.whatsapp || '').replace(/\D/g, '').trim();
          const dbW2 = (c.whatsapp2 || '').replace(/\D/g, '').trim();

          const ownerMatch = (inputOwner.length > 0 && dbOwner === inputOwner);
          const phoneMatch = (inputW1.length > 5 && (inputW1 === dbW1 || inputW1 === dbW2));

          return ownerMatch || phoneMatch;
        });

        // Se encontrou por match de nome+tutor, assume esse ID para editar
        if (existingClient) clientId = existingClient.id;
      }

      // Helper Conservador: Se o form estiver vazio, mantém o banco.
      const getVal = (formVal, dbVal) => {
        if (formVal && formVal.toString().trim() !== '') return formVal;
        if (existingClient && dbVal) return dbVal;
        return '';
      };

      const clientData = {
        dogName: formData.dogName || '',
        dogNameLower: (formData.dogName || '').toLowerCase(),
        dogSize: getVal(formData.dogSize, existingClient?.dogSize) || 'Pequeno',
        dogBreed: getVal(formData.dogBreed, existingClient?.dogBreed) || 'SRD',
        source: getVal(formData.source, existingClient?.source) || 'Particular',
        ownerName: getVal(formData.ownerName, existingClient?.ownerName),
        ownerName2: getVal(formData.ownerName2, existingClient?.ownerName2),
        whatsapp: getVal(formData.whatsapp, existingClient?.whatsapp),
        whatsapp2: getVal(formData.whatsapp2, existingClient?.whatsapp2),
        ownerEmail: getVal(formData.ownerEmail, existingClient?.ownerEmail),
        ownerDoc: getVal(formData.ownerDoc, existingClient?.ownerDoc),
        address: getVal(formData.address, existingClient?.address),
        birthYear: getVal(formData.birthYear, existingClient?.birthYear),
        history: getVal(formData.history, existingClient?.history),
        ownerHistory: getVal(formData.ownerHistory, existingClient?.ownerHistory),
        ownerRating: formData.ownerRating || existingClient?.ownerRating || 3,
        restrictions: getVal(formData.restrictions, existingClient?.restrictions),

        // Arrays: Prioriza form se tiver itens, senão mantem banco
        socialization: (formData.socialization && formData.socialization.length > 0) ? formData.socialization : (existingClient?.socialization || []),
        medications: (formData.medications && formData.medications.length > 0) ? formData.medications : (existingClient?.medications || []),
        photos: (formData.photos && formData.photos.length > 0) ? formData.photos : (existingClient?.photos || []),
        vaccineDocs: (formData.vaccineDocs && formData.vaccineDocs.length > 0) ? formData.vaccineDocs : (existingClient?.vaccineDocs || []),

        // Datas de vacina: Usa getVal para evitar limpar acidentalmente
        vaccines: getVal(formData.vaccines, existingClient?.vaccines),
        lastAntiRabica: getVal(formData.lastAntiRabica, existingClient?.lastAntiRabica),
        lastMultipla: getVal(formData.lastMultipla, existingClient?.lastMultipla),
        dogBehaviorRating: formData.dogBehaviorRating || existingClient?.dogBehaviorRating || 3
      };

      let bookingSummary = null;
      if (isBooking) {
        bookingSummary = {
          id: isEditingBooking ? formData.id + '_hist' : Date.now() + '_hist',
          checkIn: formData.checkIn, checkOut: formData.checkOut, observation: 'Hospedagem', rating: formData.rating,
          dogBehaviorRating: formData.dogBehaviorRating, ownerRating: formData.ownerRating,
          dailyRate: parseFloat(formData.dailyRate) || 0, totalValue: parseFloat(formData.totalValue) || 0,
          damageValue: parseFloat(formData.damageValue) || 0, damageDescription: formData.damageDescription || '',
          source: formData.source || 'Particular'
        };
      }

      let finalHistory = [];
      let clientToUpdate = existingClient;

      if (clientToUpdate) {
        clientId = clientToUpdate.id;
        const cRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientId);
        let history = clientToUpdate.pastBookings || [];
        if (bookingSummary) {
          history = history.filter(h => !(h.checkIn === bookingSummary.checkIn && h.checkOut === bookingSummary.checkOut));
          history = [bookingSummary, ...history];
        }
        finalHistory = history;
        await updateDoc(cRef, { ...clientData, pastBookings: finalHistory });
      } else {
        finalHistory = bookingSummary ? [bookingSummary] : [];
        const docRef = await addDoc(clientsRef, { ...clientData, pastBookings: finalHistory });
        clientId = docRef.id;
      }

      // Atualização Otimista: Clientes (Merge Seguro)
      setClients(prev => {
        const idx = prev.findIndex(c => c.id === clientId);
        if (idx >= 0) {
          const newArr = [...prev];
          newArr[idx] = { ...newArr[idx], ...clientData, pastBookings: finalHistory };
          return newArr;
        }
        return [...prev, { ...clientData, id: clientId, pastBookings: finalHistory }];
      });

      if (isBooking) {
        const bRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
        const bData = { ...formData, clientId: clientId };
        Object.keys(bData).forEach(key => bData[key] === undefined && delete bData[key]);

        let bookingId = modalMode !== 'booking_request' ? editingData?.id : null;
        if (bookingId) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', bookingId), bData);
        } else {
          const newBookingRef = await addDoc(bRef, bData);
          bookingId = newBookingRef.id;

          if (modalMode === 'booking_request' && editingData?.id) {
            try {
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'booking_requests', editingData.id), {
                status: 'approved',
                bookingId: bookingId
              });
            } catch (e) {
              console.error("Erro ao atualizar request original", e);
            }
          }
        }

        // Atualização Otimista: Reservas (Merge Seguro)
        setBookings(prev => {
          const idx = prev.findIndex(b => b.id === bookingId);
          const newBooking = { ...bData, id: bookingId };
          if (idx >= 0) {
            const newArr = [...prev];
            newArr[idx] = { ...newArr[idx], ...newBooking };
            return newArr;
          }
          return [...prev, newBooking];
        });
      }

      setIsModalOpen(false); setEditingData(null);
    } catch (e) {
      console.error("Erro ao salvar:", e);
      alert("Erro ao salvar: " + e.message);
    }
  };

  const requestDeleteBooking = (id) => {
    setDeleteConfirmation({ isOpen: true, bookingId: id });
  };

  const confirmDeleteBooking = async () => {
    const id = deleteConfirmation.bookingId;
    if (!id) return;

    try {
      // 1. Busca a reserva para identificar o cliente
      const bookingRef = doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id);
      const bookingSnap = await getDoc(bookingRef);

      if (bookingSnap.exists()) {
        const bookingData = bookingSnap.data();
        const clientId = bookingData.clientId;

        if (clientId) {
          const clientRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientId);
          const clientSnap = await getDoc(clientRef);

          if (clientSnap.exists()) {
            const clientData = clientSnap.data();
            // Remove do histórico
            const newHistory = (clientData.pastBookings || []).filter(h => {
              if (h.id === id || h.id === id + '_hist') return false;
              return !(h.checkIn === bookingData.checkIn && h.checkOut === bookingData.checkOut);
            });
            await updateDoc(clientRef, { pastBookings: newHistory });
          }
        }
      }

      // 2. Deleta a reserva
      await deleteDoc(bookingRef);
    } catch (e) {
      console.error("Erro ao deletar:", e);
      alert("Erro ao deletar: " + e.message);
    }
  };

  const handleMobileNav = (tab) => {
    setActiveTab(tab);
    if (tab === 'agenda') setView('month');
    setIsMobileMenuOpen(false);
  };

  const handleAcceptRequest = (req) => {
    setEditingData(req);
    setModalMode('booking_request');
    setIsModalOpen(true);
  };

  // --- RENDERIZADORES ---
  const renderWeekView = () => {
    const start = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    return (
      <div className="w-full overflow-x-auto pb-4">
        <div className="grid grid-cols-7 gap-2 min-w-[800px]">
          {days.map((day, i) => (
            <div key={i} className={`border rounded-lg flex flex-col h-[500px] ${day.getDate() === new Date().getDate() ? 'bg-primary-50 border-primary-200' : 'bg-white'}`}>
              <div className="p-2 text-center border-b font-medium text-secondary-600">
                {day.toLocaleDateString('pt-BR', { weekday: 'short' })} <br /><span className="text-sm">{day.getDate()}/{day.getMonth() + 1}</span>
                <div className="mt-1">
                  {(() => {
                    const capInfo = getCapacityInfoForDate(day, maxCapacity, capacityOverrides);
                    const currentBookings = getBookingsForDate(day).length;
                    const remain = capInfo.capacity - currentBookings;
                    if (capInfo.capacity === 0) {
                      return <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px] block">Bloqueado</span>;
                    } else if (remain <= 0) {
                      return <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px] block">Lotação Completa</span>;
                    } else {
                      return <span className="bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded text-[10px] block">{remain} Vagas</span>;
                    }
                  })()}
                </div>
              </div>
              <div className="flex-1 p-1 overflow-y-auto space-y-2 scrollbar-thin">
                {getBookingsForDate(day).map(b => (
                  <div key={b.id} onClick={() => { if (userRole === 'admin') { setEditingData(b); setModalMode('booking'); setIsModalOpen(true); } }} className={`p-2 bg-white border-l-4 ${userRole === 'admin' ? 'border-l-primary-600 cursor-pointer hover:bg-primary-50' : 'border-l-secondary-400 cursor-default'} rounded shadow-sm text-xs border border-secondary-100`}>
                    <div className={`font-bold truncate ${userRole !== 'admin' ? 'text-secondary-600' : ''}`}>
                      {userRole === 'admin' ? b.dogName : (clients.find(c => c.id === b.clientId)?.dogBreed || 'SRD')}
                    </div>
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
    const days = [...Array(new Date(y, m, 1).getDay()).fill(null), ...Array(new Date(y, m + 1, 0).getDate()).keys().map(i => new Date(y, m, i + 1))];
    return (
      <div className="w-full overflow-x-auto pb-4">
        <div className="grid grid-cols-7 gap-px bg-secondary-200 border border-secondary-200 rounded-lg overflow-hidden min-w-[800px]">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d} className="bg-secondary-100 p-2 text-center font-bold text-secondary-600">{d}</div>)}
          {days.map((day, i) => {
            if (!day) return <div key={i} className="bg-white h-48"></div>;
            const isToday = day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth() && day.getFullYear() === new Date().getFullYear();
            return (
              <div
                key={i}
                id={isToday ? 'today-cell' : undefined}
                onClick={() => { setView('day'); setCurrentDate(day); }}
                className={`bg-white h-48 p-1 flex flex-col hover:bg-secondary-50 cursor-pointer transition-colors duration-300 ${isToday ? 'bg-yellow-50 border-2 border-yellow-400 shadow-inner' : ''}`}
              >
                <div className="flex justify-between items-start px-1 pt-1 flex-wrap gap-1">
                  <span className={`text-sm font-medium ${isToday ? 'text-yellow-700 font-bold' : ''}`}>{day.getDate()}</span>
                  <div className="flex flex-col gap-0.5 items-end">
                    {(() => {
                      const capInfo = getCapacityInfoForDate(day, maxCapacity, capacityOverrides);
                      const currentBookings = getBookingsForDate(day).length;
                      const remain = capInfo.capacity - currentBookings;
                      if (capInfo.capacity === 0) {
                        return <span className="bg-red-100 text-red-800 font-bold px-1 rounded text-[9px] leading-tight">Bloqueado</span>;
                      } else if (remain <= 0) {
                        return <span className="bg-red-100 text-red-800 font-bold px-1 rounded text-[9px] leading-tight">Lotado</span>;
                      } else {
                        return <span className="bg-green-100 text-green-800 font-bold px-1 rounded text-[9px] leading-tight">{remain} Vagas</span>;
                      }
                    })()}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 mt-1">
                  {getBookingsForDate(day).slice(0, 6).map(b => (
                    <div key={b.id} className={`text-xs truncate px-1 rounded border ${userRole === 'admin' ? 'bg-primary-100 text-primary-800 border-primary-200' : 'bg-secondary-100 text-secondary-600 border-secondary-200'}`}>
                      {userRole === 'admin' ? b.dogName : (clients.find(c => c.id === b.clientId)?.dogBreed || 'SRD')}
                    </div>
                  ))}
                  {getBookingsForDate(day).length > 6 && <div className="text-xs text-secondary-400 text-center">+{getBookingsForDate(day).length - 6}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} db={db} appId={appId} isDbReady={true} />;

  return (
    <DataProvider user={user}>
      <div className="flex h-screen bg-background font-sans text-secondary-900 overflow-hidden">
        {/* SIDEBAR DESKTOP */}
        <aside className="hidden md:flex w-64 bg-primary-800 text-white flex-col shadow-xl z-20">
          <div className="p-6 flex items-center gap-3 border-b border-primary-700">
            <div className="shrink-0 bg-white rounded-full p-1">
              <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-wide">Uma Casa Boa</h1>
              <p className="text-xs font-medium opacity-80 leading-tight uppercase tracking-widest mt-1">Pra Cachorro</p>
            </div>
          </div>

          <nav className="flex-1 py-6 space-y-2 px-3">
            {userRole === 'admin' && (
              <>
                <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'home' ? 'bg-primary-700 shadow' : 'hover:bg-primary-700'}`}><Home size={20} /> Início</button>
                <button onClick={() => setActiveTab('financial')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'financial' ? 'bg-primary-700 shadow' : 'hover:bg-primary-700'}`}><PieChart size={20} /> Financeiro</button>
              </>
            )}
            <button onClick={() => { setActiveTab('agenda'); setView('month'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'agenda' ? 'bg-primary-700 shadow' : 'hover:bg-primary-700'}`}><Calendar size={20} /> Agenda</button>
            {userRole === 'admin' && (
              <>
                <button onClick={() => setActiveTab('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'clients' ? 'bg-primary-700 shadow' : 'hover:bg-primary-700'}`}><User size={20} /> Cadastros</button>
                <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'requests' ? 'bg-primary-700 shadow' : 'hover:bg-primary-700'}`}><Inbox size={20} /> Solicitações</button>
              </>
            )}
            {userRole === 'user' && (
              <>
                <button onClick={() => setActiveTab('my_profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'my_profile' ? 'bg-primary-700 shadow' : 'hover:bg-primary-700'}`}><User size={20} /> Meu Cadastro</button>
                <button onClick={() => setActiveTab('my_requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'my_requests' ? 'bg-primary-700 shadow' : 'hover:bg-primary-700'}`}><Inbox size={20} /> Minhas Solicitações</button>
              </>
            )}
            <button onClick={() => setActiveTab('breed')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'breed' ? 'bg-primary-700 shadow' : 'hover:bg-primary-700'}`}><PawPrint size={20} /> Minha Raça</button>
            {userRole === 'admin' && (
              <button onClick={() => setActiveTab('admin_panel')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'admin_panel' ? 'bg-primary-700 shadow' : 'hover:bg-primary-700'}`}><Shield size={20} /> Administração</button>
            )}
          </nav>

          <div className="px-6 pb-4 mt-auto">
            <div className="text-[10px] text-primary-300 font-mono opacity-60 text-center border-t border-primary-700 pt-2">
              versão {appVersion}
            </div>
          </div>

          <div className="px-3 pb-2">
            <InstallButton deferredPrompt={deferredPrompt} />
            <div className="mt-2"><NotificationManager /></div>
          </div>

          <div className="p-4 border-t border-primary-700"><button onClick={() => { if (confirm("Sair?")) setIsAuthenticated(false) }} className="w-full flex gap-2 text-secondary-300 hover:text-white"><LogOut size={16} /> Sair</button></div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="bg-white shadow-sm h-16 flex items-center px-4 md:px-6 justify-between z-30 relative">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 rounded-lg text-secondary-600 hover:bg-secondary-100 focus:outline-none">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              <h2 className="text-xl font-bold text-secondary-700 hidden md:block">
                {activeTab === 'home' ? 'Início' : activeTab === 'agenda' ? 'Agenda' : activeTab === 'clients' ? 'Gerenciamento de Clientes' : activeTab === 'requests' ? 'Solicitações de Hospedagem' : activeTab === 'my_requests' ? 'Minhas Solicitações' : activeTab === 'breed' ? 'Identificador de Raças' : activeTab === 'my_profile' ? 'Meu Cadastro' : activeTab === 'admin_panel' ? 'Administração do Sistema' : 'Financeiro'}
              </h2>

              <div className="flex items-center gap-2 md:hidden">
                <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <h2 className="font-bold text-primary-800 leading-none text-[15px]">Uma Casa Boa</h2>
                  <p className="font-bold text-primary-600 leading-none text-[10px] uppercase tracking-wider">Pra Cachorro</p>
                </div>
              </div>
            </div>



            <div className="flex items-center gap-3">
              <span className="text-sm text-secondary-500 hidden md:block">Olá, {userName}</span>
              <NotificationBell />
              {userRole === 'admin' && (
                <button onClick={() => { setEditingData(null); setModalMode('booking'); setIsModalOpen(true); }} className="bg-accent-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold flex items-center gap-2 shadow hover:bg-accent-600 text-sm md:text-base">
                  <Plus size={20} /> <span className="hidden sm:inline">Nova Reserva</span><span className="sm:hidden">Nova</span>
                </button>
              )}
            </div>
          </header>

          {/* MENU MOBILE */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 w-full bg-white shadow-xl border-t border-secondary-100 z-20 animate-fade-in flex flex-col p-2">
              {userRole === 'admin' && (
                <>
                  <button onClick={() => handleMobileNav('home')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'home' ? 'bg-primary-50 text-primary-600' : 'text-secondary-700 hover:bg-secondary-50'}`}><Home size={20} /> Início</button>
                  <button onClick={() => handleMobileNav('financial')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'financial' ? 'bg-primary-50 text-primary-600' : 'text-secondary-700 hover:bg-secondary-50'}`}><PieChart size={20} /> Financeiro</button>
                </>
              )}
              <button onClick={() => handleMobileNav('agenda')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'agenda' ? 'bg-primary-50 text-primary-600' : 'text-secondary-700 hover:bg-secondary-50'}`}><Calendar size={20} /> Agenda</button>
              {userRole === 'admin' && (
                <>
                  <button onClick={() => handleMobileNav('clients')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'clients' ? 'bg-primary-50 text-primary-600' : 'text-secondary-700 hover:bg-secondary-50'}`}><User size={20} /> Cadastros</button>
                  <button onClick={() => handleMobileNav('requests')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'requests' ? 'bg-primary-50 text-primary-600' : 'text-secondary-700 hover:bg-secondary-50'}`}><Inbox size={20} /> Solicitações</button>
                </>
              )}
              {userRole === 'user' && (
                <>
                  <button onClick={() => handleMobileNav('my_profile')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'my_profile' ? 'bg-primary-50 text-primary-600' : 'text-secondary-700 hover:bg-secondary-50'}`}><User size={20} /> Meu Cadastro</button>
                  <button onClick={() => handleMobileNav('my_requests')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'my_requests' ? 'bg-primary-50 text-primary-600' : 'text-secondary-700 hover:bg-secondary-50'}`}><Inbox size={20} /> Minhas Solicitações</button>
                </>
              )}
              <button onClick={() => handleMobileNav('breed')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'breed' ? 'bg-primary-50 text-primary-600' : 'text-secondary-700 hover:bg-secondary-50'}`}><PawPrint size={20} /> Minha Raça</button>
              {userRole === 'admin' && (
                <button onClick={() => handleMobileNav('admin_panel')} className={`flex items-center gap-3 p-4 rounded-lg font-medium ${activeTab === 'admin_panel' ? 'bg-primary-50 text-primary-600' : 'text-secondary-700 hover:bg-secondary-50'}`}><Shield size={20} /> Administração</button>
              )}

              <div className="h-px bg-secondary-100 my-2"></div>

              <div className="flex justify-center py-2 border-b border-secondary-100 mb-2">
                <NotificationBell />
              </div>

              <div className="text-center text-xs text-secondary-400 py-2">v{appVersion}</div>

              <div className="px-2 mb-2">
                <InstallButton deferredPrompt={deferredPrompt} />
                <div className="mt-2 text-center md:hidden"><NotificationManager /></div>
              </div>

              <button onClick={() => { if (confirm("Sair?")) setIsAuthenticated(false) }} className="flex items-center gap-3 p-4 rounded-lg font-medium text-red-600 hover:bg-red-50"><LogOut size={20} /> Sair</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
            {isMobileMenuOpen && <div className="md:hidden fixed inset-0 bg-black/20 z-10 top-16" onClick={() => setIsMobileMenuOpen(false)}></div>}

            {activeTab === 'home' && (
              <UpcomingBookings
                bookings={bookings}
                clients={clients}
                onEdit={(b) => { setEditingData(b); setModalMode('booking'); setIsModalOpen(true); }}
                onDelete={(id) => requestDeleteBooking(id)}
              />
            )}

            {activeTab === 'agenda' && (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
                  <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
                    <h2 className="text-xl font-bold text-secondary-800 flex items-center gap-2">
                      <Calendar className="text-primary-600" /> Agenda
                    </h2>
                    
                    {userRole === 'user' && (
                      <button 
                        onClick={() => setIsClientBookingModalOpen(true)}
                        className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm hover:bg-primary-700 transition"
                      >
                        <Plus size={16} /> Agendar
                      </button>
                    )}
                    
                    {/* TAG DE VAGAS (SÓ NA VISÃO DIÁRIA) */}
                    {view === 'day' && (
                      <div className="hidden sm:block">
                        {(() => {
                          const capInfo = getCapacityInfoForDate(currentDate, maxCapacity, capacityOverrides);
                          const currentBookings = getBookingsForDate(currentDate).length;
                          const remain = capInfo.capacity - currentBookings;
                          if (capInfo.capacity === 0) {
                            return <span className="bg-red-100 text-red-800 font-bold px-3 py-1 rounded-full text-xs">Bloqueado / Sem Vagas</span>;
                          } else if (remain <= 0) {
                            return <span className="bg-red-100 text-red-800 font-bold px-3 py-1 rounded-full text-xs">Lotação Completa</span>;
                          } else {
                            return <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-xs">Restam {remain} Vagas</span>;
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex bg-secondary-100 p-1 rounded-lg w-full lg:w-auto">
                    {['day', 'week', 'month'].map(v => <button key={v} onClick={() => setView(v)} className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-sm font-medium transition ${view === v ? 'bg-white shadow text-primary-600' : 'text-secondary-600'}`}>{v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}</button>)}
                  </div>
                </div>

                {/* TAG DE VAGAS MOBILE (SÓ NA VISÃO DIÁRIA) */}
                {view === 'day' && (
                  <div className="sm:hidden -mt-4">
                    {(() => {
                      const capInfo = getCapacityInfoForDate(currentDate, maxCapacity, capacityOverrides);
                      const currentBookings = getBookingsForDate(currentDate).length;
                      const remain = capInfo.capacity - currentBookings;
                      if (capInfo.capacity === 0) {
                        return <span className="block text-center bg-red-100 text-red-800 font-bold px-3 py-2 rounded-lg text-sm">Bloqueado / Sem Vagas</span>;
                      } else if (remain <= 0) {
                        return <span className="block text-center bg-red-100 text-red-800 font-bold px-3 py-2 rounded-lg text-sm">Lotação Completa</span>;
                      } else {
                        return <span className="block text-center bg-green-100 text-green-800 font-bold px-3 py-2 rounded-lg text-sm">Ainda restam {remain} Vagas</span>;
                      }
                    })()}
                  </div>
                )}

                <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl shadow-sm border">
                  <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-secondary-100 rounded-full"><ChevronLeft /></button>
                  <h3 className="text-lg font-bold text-primary-600 capitalize text-center w-48">
                    {view === 'day' && formatDateBR(currentDate)}
                    {view === 'month' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    {view === 'week' && `Semana de ${startOfWeek(currentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                  </h3>
                  <button onClick={() => navigateDate(1)} className="p-2 hover:bg-secondary-100 rounded-full"><ChevronRight /></button>
                </div>

                {view === 'day' && (
                  getBookingsForDate(currentDate).length === 0 ?
                    <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-secondary-200 text-secondary-400">Nenhuma hospedagem.</div> :
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {getBookingsForDate(currentDate).map(b => (
                        <BookingCard 
                          key={b.id} 
                          booking={b} 
                          onEdit={() => { if (userRole === 'admin') { setEditingData(b); setModalMode('booking'); setIsModalOpen(true); } }} 
                          onDelete={() => requestDeleteBooking(b.id)} 
                          userRole={userRole}
                          clientBreed={clients.find(c => c.id === b.clientId)?.dogBreed || 'SRD'}
                        />
                      ))}
                    </div>
                )}
                {view === 'week' && renderWeekView()}
                {view === 'month' && renderMonthView()}
              </div>
            )}

            {activeTab === 'clients' && <ClientList clients={clients} onEdit={(c) => { setEditingData(c); setModalMode(c ? 'client_edit' : 'client_new'); setIsModalOpen(true); }} onDelete={(id) => { if (confirm("Deletar?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', id)) }} />}
            {activeTab === 'financial' && <FinancialPanel bookings={bookings.map(b => ({ ...b, clientName: clients.find(c => c.id === b.clientId)?.dogName }))} onDelete={requestDeleteBooking} />}
            {activeTab === 'requests' && userRole === 'admin' && <BookingRequestsPanel db={db} appId={appId} onAcceptRequest={handleAcceptRequest} />}
            {activeTab === 'my_requests' && userRole === 'user' && <ClientRequestsPanel db={db} appId={appId} user={user} />}
            {activeTab === 'breed' && <BreedIdentifier />}
            {activeTab === 'admin_panel' && userRole === 'admin' && <AdminPanel db={db} appId={appId} />}
            {activeTab === 'my_profile' && userRole === 'user' && <MyProfile db={db} appId={appId} user={user} races={races} />}
          </div>
        </main>

        {isModalOpen && (
          <BookingModal
            data={editingData}
            mode={modalMode}
            bookings={bookings}
            clientDatabase={clients}
            onSave={handleSave}
            onClose={() => setIsModalOpen(false)}
            races={races}
            onAddRace={(name) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'races'), { name })}
            onDeleteRace={async (id) => {
              try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'races', id));
              } catch (error) {
                alert("Erro ao deletar raça: " + error.message);
              }
            }}
            onCreateClient={() => { setEditingData(null); setModalMode('client_new'); }}
            onOpenBooking={(historyItem) => {
              // Tenta encontrar a reserva original
              let found = bookings.find(b => b.id === historyItem.id);

              // Se não achar pelo ID direto (pode ter sufixo ou ser antigo), tenta por heurística
              if (!found) {
                // Remove sufixo _hist se existir
                const cleanId = historyItem.id.toString().replace('_hist', '');
                found = bookings.find(b => b.id === cleanId);
              }

              if (!found) {
                // Heurística final: Cliente + Datas
                const clientId = modalMode === 'booking' ? editingData?.clientId : editingData?.id;
                found = bookings.find(b =>
                  b.clientId === clientId &&
                  b.checkIn === historyItem.checkIn &&
                  b.checkOut === historyItem.checkOut
                );
              }

              if (found) {
                setEditingData(found);
                setModalMode('booking');
                // setIsModalOpen(true); // Já está aberto, mas mudamos o conteúdo
              } else {
                alert("Reserva original não encontrada no banco de dados.");
              }
            }}
          />
        )}

        {isClientBookingModalOpen && (
          <ClientBookingModal 
            onClose={() => setIsClientBookingModalOpen(false)} 
            user={user} 
            clientDatabase={clients}
            bookings={bookings}
            maxCapacity={maxCapacity}
            capacityOverrides={capacityOverrides}
          />
        )}
      </div>
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        onConfirm={confirmDeleteBooking}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta reserva? Esta ação também removerá o registro do histórico do cliente."
        confirmText="Sim, Excluir"
        isDanger={true}
      />
    </DataProvider>
  );
}