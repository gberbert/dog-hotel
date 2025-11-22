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
import InstallButton from './components/InstallButton';
import AppIcon from './components/AppIcon';

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

  // --- ESTADO DO PWA ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true); // Controle para fechar o banner

  // --- CAPTURA EVENTO DE INSTALAÇÃO ---
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true); // Garante que o banner apareça quando o evento ocorrer
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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

  const handleMobileNav = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

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
    const days = [...Array(new Date(y,