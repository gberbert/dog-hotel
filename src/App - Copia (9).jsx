import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Clock, User, Dog, MapPin, FileText, 
  Star, Camera, Plus, X, ChevronLeft, ChevronRight, 
  DollarSign, Trash2, Edit, CheckCircle, AlertCircle,
  Heart, History, Search, LayoutGrid, Users, Menu,
  LogOut, Lock, Mail, Send, PieChart, TrendingUp, CalendarRange, AlertTriangle,
  Smile, Meh, Frown, Angry, Laugh, Upload, MessageCircle, FilePlus, Pill
} from 'lucide-react';

// --- IMPORTAÇÕES DO FIREBASE ---
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDocs 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from 'firebase/storage';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyACJGg6OZiZ16aEBOTFaUq9kqQmLxV6OU0",
  authDomain: "doghotel-eca69.firebaseapp.com",
  projectId: "doghotel-eca69",
  storageBucket: "doghotel-eca69.firebasestorage.app",
  messagingSenderId: "845677452140",
  appId: "1:845677452140:web:eb3d58618809c16dccf149"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Identificador do App
const appId = 'doghotel-production';

// --- FUNÇÃO DE COMPRESSÃO DE IMAGEM ---
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        const MAX_SIZE_MB = 3;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        let compressedBlob;

        do {
          compressedBlob = dataURItoBlob(canvas.toDataURL('image/jpeg', quality));
          quality -= 0.1;
        } while (compressedBlob.size > MAX_SIZE_MB * 1024 * 1024 && quality > 0.3);

        if (compressedBlob.size > MAX_SIZE_MB * 1024 * 1024) {
          reject(new Error(`O arquivo ainda é maior que ${MAX_SIZE_MB}MB mesmo após compressão.`));
        } else {
          resolve(compressedBlob);
        }
      };
      img.src = event.target.result;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const dataURItoBlob = (dataURI) => {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

// --- COMPONENTES AUXILIARES ---

const StarRating = ({ rating, setRating, readonly = false, size = 24 }) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={(e) => { e.preventDefault(); !readonly && setRating && setRating(star); }}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'} focus:outline-none transition-colors duration-200`}
          disabled={readonly}
          title={`Nota ${star}`}
        >
          <Star
            size={readonly ? (size > 16 ? 16 : size) : size}
            className={`${star <= rating ? 'fill-current text-[#FFD700]' : 'text-gray-300'}`}
            strokeWidth={star <= rating ? 0 : 2}
            stroke={star <= rating ? 'none' : '#9CA3AF'}
          />
        </button>
      ))}
    </div>
  );
};

const FaceRating = ({ rating, setRating, readonly = false, size = 24 }) => {
  const faces = [
    { val: 1, icon: Angry, color: 'text-[#FF0000]', label: 'Raiva' },
    { val: 2, icon: Frown, color: 'text-[#FF7F00]', label: 'Triste' },
    { val: 3, icon: Meh, color: 'text-[#FFD700]', label: 'Neutro' },
    { val: 4, icon: Smile, color: 'text-[#00FF00]', label: 'Bom' },
    { val: 5, icon: Laugh, color: 'text-[#00AA00]', label: 'Excelente' },
  ];

  const safeRating = Number(rating) || 3;

  return (
    <div className="flex space-x-3">
      {faces.map((face) => {
        const Icon = face.icon;
        const isSelected = safeRating === face.val;
        
        return (
          <button
            key={face.val}
            type="button"
            onClick={(e) => { e.preventDefault(); !readonly && setRating && setRating(face.val); }}
            className={`
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}
              flex flex-col items-center gap-1 focus:outline-none group
            `}
            disabled={readonly}
            title={face.label}
          >
            <Icon
              size={size}
              className={`
                ${isSelected ? face.color : 'text-gray-300'} 
                ${isSelected && !readonly ? 'fill-current opacity-100 stroke-[2.5px]' : 'group-hover:text-gray-400'}
                transition-all duration-200
              `}
              strokeWidth={isSelected ? 2.5 : 2}
            />
            {!readonly && size > 20 && (
                <span className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}> 
                    {face.label}
                </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// --- NOVO COMPONENTE: VISUALIZADOR DE IMAGEM (LIGHTBOX) ---
const ImageLightbox = ({ images, currentIndex, onClose, setIndex }) => {
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') setIndex((currentIndex + 1) % images.length);
        if (e.key === 'ArrowLeft') setIndex((currentIndex - 1 + images.length) % images.length);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, images.length, onClose, setIndex]);
  
    if (!images || images.length === 0) return null;
  
    return (
      <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm animate-fade-in">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full bg-black/20 hover:bg-white/10 transition"
            title="Fechar (Esc)"
        >
            <X size={32} />
        </button>
        
        {images.length > 1 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIndex((currentIndex - 1 + images.length) % images.length); }} 
            className="absolute left-4 text-white hover:text-gray-300 p-3 rounded-full bg-black/20 hover:bg-white/10 transition"
          >
            <ChevronLeft size={40} />
          </button>
        )}
        
        <div className="relative max-w-[90vw] max-h-[90vh]">
             <img 
                src={images[currentIndex]} 
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" 
                alt={`Foto ${currentIndex + 1}`} 
             />
             <div className="absolute -bottom-10 left-0 right-0 text-center text-white text-sm font-medium">
                {currentIndex + 1} de {images.length}
             </div>
        </div>
        
        {images.length > 1 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIndex((currentIndex + 1) % images.length); }} 
            className="absolute right-4 text-white hover:text-gray-300 p-3 rounded-full bg-black/20 hover:bg-white/10 transition"
          >
            <ChevronRight size={40} />
          </button>
        )}
      </div>
    );
  };

// --- COMPONENTE DE LOGIN ---
const LoginScreen = ({ onLogin, db, appId, isDbReady }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!isDbReady) {
        alert("Aguardando conexão com o servidor...");
        return;
    }
    
    setIsLoading(true);
    
    try {
        const loginsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logins');
        const q = query(loginsRef, where("email", "==", email), where("password", "==", password));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            onLogin();
        } else {
            alert("Email ou senha incorretos. Verifique suas credenciais.");
            setIsLoading(false);
        }
    } catch (error) {
        console.error("Erro ao realizar login:", error);
        alert(`Erro de conexão: ${error.message}`);
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0000FF] to-[#0000AA] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-indigo-50 p-8 text-center">
           <div className="inline-flex bg-white p-4 rounded-full shadow-md mb-4">
             <Dog size={48} className="text-[#FF7F00]" />
           </div>
           <h1 className="text-2xl font-bold text-[#0000FF]">DogHotel Manager</h1>
           <p className="text-[#FF7F00]">Gestão Compartilhada</p>
        </div>
        <div className="p-8">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-[#0000FF]" size={20} />
                  <input type="email" required name='email' value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0000FF] outline-none" placeholder="seu@email.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-[#0000FF]" size={20} />
                  <input type="password" required name='password' value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0000FF] outline-none" placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" disabled={isLoading || !isDbReady} className="w-full bg-[#0000FF] text-white py-3 rounded-lg font-bold hover:bg-[#0000AA] transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70">
                {isLoading ? 'Verificando...' : 'Acessar Sistema'}
              </button>
            </form>
            <p className="text-xs text-center text-gray-400 mt-4">
                Status do Banco de Dados: {isDbReady ? <span className="text-[#00FF00] font-bold">Conectado</span> : <span className="text-[#FF0000]">Conectando...</span>}
            </p>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTES PRINCIPAIS ---

function BookingCard({ booking, onEdit, onDelete }) {
    const getWhatsAppLink = (number) => {
      if (!number) return null;
      const cleanNumber = number.replace(/\D/g, '');
      const finalNumber = (cleanNumber.length === 10 || cleanNumber.length === 11) ? `55${cleanNumber}` : cleanNumber;
      return `https://wa.me/${finalNumber}`;
    };

    const waLink = getWhatsAppLink(booking.whatsapp);

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 relative group">
        
        {/* BLOCO PRINCIPAL: FOTO + NOME + TUTOR */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 overflow-hidden"> {/* AUMENTADO O ESPAÇAMENTO DO GAP */}
            <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm flex-shrink-0"> {/* AUMENTADO PARA W-16 H-16 */}
              {booking.clientPhoto ? ( <img src={booking.clientPhoto} alt={booking.dogName} className="w-full h-full object-cover" /> ) : <Dog className="w-full h-full p-2 text-gray-400" />} {/* AJUSTADO O PADDING DO ÍCONE */}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xl text-gray-800 truncate">{booking.dogName}</h4> {/* AUMENTADO O TAMANHO DO TEXTO */}
              <div className="flex items-center gap-2 mt-0.5">
                 <p className="text-sm text-gray-500 flex items-center gap-1 truncate"><User size={14} className="text-[#FF7F00]"/> {booking.ownerName}</p>
                 {waLink && (
                   <a 
                    href={waLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-[#00FF00]/10 text-[#00AA00] p-1 rounded-full hover:bg-[#00FF00]/20 transition"
                    title="Abrir WhatsApp"
                    onClick={(e) => e.stopPropagation()}
                   >
                     <MessageCircle size={14} />
                   </a>
                 )}
              </div>
            </div>
          </div>
          {/* REMOVIDO: Avaliação de comportamento do topo (item removido) */}
          {/* <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded text-[#0000FF] flex-shrink-0">
            <FaceRating rating={booking.dogBehaviorRating || 3} readonly size={16} />
          </div> */}
        </div>
        
        {/* DATAS DE AGENDAMENTO */}
        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
          <div className="bg-[#00FF00]/10 p-2 rounded text-[#00AA00] flex flex-col"><span className="text-xs uppercase font-bold">Entrada</span><span className="font-medium">{new Date(booking.checkIn).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', hour:'2-digit', minute:'2-digit'})}</span></div>
          <div className="bg-[#FF0000]/10 p-2 rounded text-[#FF0000] flex flex-col"><span className="text-xs uppercase font-bold">Saída</span><span className="font-medium">{new Date(booking.checkOut).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', hour:'2-digit', minute:'2-digit'})}</span></div>
        </div>
        
        {/* POSICIONAMENTO CARINHAS ABAIXO DAS DATAS */}
        <div className="w-full flex justify-end">
            <div className="flex items-center justify-end">
                <span className="text-xs font-medium text-gray-500 mr-2">Comp. Geral:</span>
                <FaceRating rating={booking.dogBehaviorRating || 3} readonly size={18} />
            </div>
        </div>
        
        {booking.damageValue > 0 && ( <div className="flex items-center gap-2 text-xs text-[#FF0000] bg-[#FF0000]/10 p-2 rounded font-bold border border-[#FF0000]/20"><AlertTriangle size={14} /> Prejuízo Registrado: R$ {booking.damageValue}</div> )}
        
        {/* PREÇO E AÇÕES */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center">
           <span className="font-bold text-[#0000FF]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((booking.totalValue || 0) - (booking.damageValue || 0))}</span>
           <div className="flex gap-2"><button onClick={onEdit} className="p-2 text-gray-400 hover:text-[#0000FF] hover:bg-indigo-50 rounded-full transition"><Edit size={18} /></button><button onClick={onDelete} className="p-2 text-gray-400 hover:text-[#FF0000] hover:bg-red-50 rounded-full transition"><Trash2 size={18} /></button></div>
        </div>
      </div>
    );
}

function BookingModal({ data, mode, clientDatabase, onSave, onClose, races, onAddRace }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [newRace, setNewRace] = useState(''); // Novo estado para nova raça
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', time: '' }); // Novo estado para nova medicação

  const [formData, setFormData] = useState({
    clientId: data?.clientId || (mode.startsWith('client') && data?.id ? data.id : '') || '',
    dogName: data?.dogName || '', 
    dogSize: data?.dogSize || 'Pequeno', 
    dogBreed: data?.dogBreed || 'Sem Raça Definida (SRD)', // Novo Campo: Raça
    source: data?.source || 'Particular', // Novo Campo: Captação
    
    // TUTOR 1 (Primário)
    ownerName: data?.ownerName || '', 
    whatsapp: data?.whatsapp || '',
    
    // TUTOR 2 (Secundário)
    ownerName2: data?.ownerName2 || '', // Novo campo Tutor 2
    whatsapp2: data?.whatsapp2 || '',   // Novo campo WhatsApp 2

    ownerEmail: data?.ownerEmail || '',
    ownerDoc: data?.ownerDoc || '',
    address: data?.address || '',
    birthYear: data?.birthYear || '', // ALTERADO: Usa birthYear (Ano de Nascimento)
    history: data?.history || '',
    ownerHistory: data?.ownerHistory || '', 
    ownerRating: data?.ownerRating || 3, 
    restrictions: data?.restrictions || '', 
    socialization: data?.socialization || [], 
    
    medications: data?.medications || [], // Novo campo: Lista de medicações

    checkIn: data?.checkIn || '', 
    checkOut: data?.checkOut || '',
    rating: data?.rating || 5, 
    dogBehaviorRating: data?.dogBehaviorRating || 3, 
    dailyRate: data?.dailyRate || 80, 
    totalValue: data?.totalValue || 0,
    damageValue: data?.damageValue || '', 
    damageDescription: data?.damageDescription || '',
    photos: data?.photos || [], 
    vaccineDocs: data?.vaccineDocs || [],
    vaccines: data?.vaccines || '',
    lastAntiRabica: data?.lastAntiRabica || '',
    lastMultipla: data?.lastMultipla || '',
    pastBookings: data?.pastBookings || []
  });
  const [socialDogInput, setSocialDogInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [vaccineLightboxIndex, setVaccineLightboxIndex] = useState(-1);
  
  const isBookingMode = mode === 'booking';

  const totalPaidValue = (formData.pastBookings || []).reduce((acc, curr) => {
    const total = parseFloat(curr.totalValue) || 0;
    const damage = parseFloat(curr.damageValue) || 0;
    return acc + (total - damage); 
  }, 0);

  // --- CÁLCULO DE IDADE REAL (EM ANOS) ---
  const calculateAge = (birthYear) => {
    if (!birthYear) return 0;
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(birthYear);
    return age < 0 ? 0 : age;
  };
  
  const realAgeYears = calculateAge(formData.birthYear);

  // --- GERAÇÃO DA LISTA DE ANOS ---
  const generateYearOptions = () => {
    const years = [];
    const START_YEAR = 2000;
    const END_YEAR = 2030;
    for (let year = END_YEAR; year >= START_YEAR; year--) { // Inverte para o ano mais recente primeiro
      years.push(year);
    }
    return years;
  };

  // --- CÁLCULO DE IDADE HUMANA (LÓGICA DA TABELA EM ANEXO) ---
  const calculateHumanAge = (ageInYears, size) => {
    const age = ageInYears;

    // Tabela de mapeamento da imagem anexa (Idade Humana)
    // Pequeno, Médio, Grande, Gigante.
    const humanAgeMap = {
        'Pequeno': [22, 27, 29, 36, 46, 55, 68, 76, 87, 99], // Idade Real: 1, 2, 4, 6, 8, 10, 14, 16, 18, 20
        'Médio':   [12, 23, 39, 51, 63, 75, 95, 95, 95, 95], 
        'Grande':  [8, 16, 22, 40, 55, 75, 94, 94, 94, 94], 
        'Gigante': [12, 22, 40, 55, 75, 94, 94, 94, 94, 94]
    };

    const dogAgePoints = [1, 2, 4, 6, 8, 10, 14, 16, 18, 20]; // Pontos de referência simplificados
    const sizeKey = size || 'Pequeno';
    const ages = humanAgeMap[sizeKey] || humanAgeMap['Pequeno'];

    if (age <= 0) return 0;
    
    // Trata idades menores que 1 ano (usando o valor de 1 ano como referência)
    if (age < 1) return Math.round(age * ages[0]);
    
    // Interpolação para anos inteiros
    for (let i = 0; i < dogAgePoints.length; i++) {
        const point = dogAgePoints[i];
        
        if (age === point) {
            return ages[i];
        }
        
        // Se estiver entre dois pontos conhecidos
        if (age > point && i + 1 < dogAgePoints.length && age < dogAgePoints[i+1]) {
            const lowerAge = point;
            const upperAge = dogAgePoints[i+1];
            const lowerHuman = ages[i];
            const upperHuman = ages[i+1];
            
            // Linear Interpolation
            const ratio = (age - lowerAge) / (upperAge - lowerAge);
            const interpolatedAge = lowerHuman + ratio * (upperHuman - lowerHuman);
            return Math.round(interpolatedAge);
        }

        // Se for maior ou igual ao último ponto de dados (20 anos)
        if (age >= 20) {
            return ages[ages.length - 1];
        }
    }
    
    return ages[ages.length - 1]; // Fallback
  };

  const humanAge = calculateHumanAge(realAgeYears, formData.dogSize);

  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  
  const handleMedicationChange = (e) => { 
    const { name, value } = e.target;
    setNewMedication(prev => ({ ...prev, [name]: value }));
  };

  const handleAddMedication = (e) => {
    e.preventDefault();
    if (newMedication.name && newMedication.dosage && newMedication.time) {
      setFormData(prev => ({
        ...prev,
        medications: [...(prev.medications || []), newMedication]
      }));
      setNewMedication({ name: '', dosage: '', time: '' });
    } else {
        alert("Preencha todos os campos da medicação.");
    }
  };

  const handleRemoveMedication = (index) => {
      setFormData(prev => ({
        ...prev,
        medications: prev.medications.filter((_, i) => i !== index)
      }));
  };

  const handleAddRace = async (e) => {
    e.preventDefault();
    if (newRace && !races.map(r => r.name.toLowerCase()).includes(newRace.toLowerCase())) {
        try {
            await onAddRace(newRace);
            setFormData(prev => ({ ...prev, dogBreed: newRace }));
            setNewRace('');
        } catch (error) {
            alert("Falha ao adicionar nova raça.");
        }
    }
  };

  // --- UPLOAD GENÉRICO (FOTOS OU VACINAS) ---
  const handleFileSelect = async (e, type) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const fileName = file.name;
        const isImage = file.type.startsWith('image/');
        const MAX_SIZE_MB = 3;

        // 1. Verificação de tamanho original para arquivos não-imagens (como PDF)
        if (!isImage && file.size > MAX_SIZE_MB * 1024 * 1024) {
             alert(`Documentos (PDF) devem ter no máximo ${MAX_SIZE_MB}MB.`);
             e.target.value = '';
             return;
        }

        // 2. Validação de limites (incluindo o que já está salvo)
        if (type === 'photos' && (formData.photos || []).length >= 5) return;
        if (type === 'vaccines' && (formData.vaccineDocs || []).length >= 3) return;

        setIsUploading(true); 
        
        let fileToUpload = file; // Padrão: arquivo original
        let mimeType = file.type;

        try {
            // 3. Processar imagens para compressão e redimensionamento
            if (isImage) {
                const compressedBlob = await compressImage(file);
                fileToUpload = compressedBlob;
                mimeType = compressedBlob.type; // Deve ser image/jpeg
                
                if (fileToUpload.size > MAX_SIZE_MB * 1024 * 1024) {
                    throw new Error(`O arquivo ainda é maior que ${MAX_SIZE_MB}MB mesmo após compressão.`);
                }
            }

            // 4. Upload para o Storage
            const uniqueName = `${type}-${Date.now()}-${fileName}`;
            const storageRef = ref(storage, `images/public/${uniqueName}`);
            
            await uploadBytes(storageRef, fileToUpload, { contentType: mimeType });
            const downloadURL = await getDownloadURL(storageRef);
            
            // 5. Atualiza o estado
            if (type === 'photos') {
                 setFormData(prev => ({ ...prev, photos: [...(prev.photos || []), downloadURL] }));
            } else if (type === 'vaccines') {
                 setFormData(prev => ({ ...prev, vaccineDocs: [...(prev.vaccineDocs || []), downloadURL] }));
            }
        } catch (error) {
            console.error("Erro no upload:", error);
            alert(`Falha ao enviar arquivo: ${error.message}.`);
        } finally {
            setIsUploading(false);
        }
    }
    e.target.value = '';
  };

  const handleAddSocialDog = (e) => { 
      e.preventDefault();
      if (socialDogInput && (formData.socialization || []).length < 5 && !(formData.socialization || []).includes(socialDogInput)) { 
          setFormData(prev => ({ ...prev, socialization: [...(prev.socialization || []), socialDogInput] })); 
          setSocialDogInput(''); 
      }
  };
  const selectClient = (client) => {
    setFormData(prev => ({ ...prev, 
      clientId: client.id, dogName: client.dogName, dogSize: client.dogSize || 'Pequeno', 
      dogBreed: client.dogBreed || 'Sem Raça Definida (SRD)', 
      source: client.source || 'Particular', 
      ownerName: client.ownerName, ownerName2: client.ownerName2 || '', 
      whatsapp: client.whatsapp, whatsapp2: client.whatsapp2 || '', // Carregar Tutor 2
      ownerEmail: client.ownerEmail || '', ownerDoc: client.ownerDoc, 
      address: client.address, birthYear: client.birthYear || '', history: client.history, 
      ownerHistory: client.ownerHistory, ownerRating: client.ownerRating, restrictions: client.restrictions, 
      socialization: client.socialization || [], 
      medications: client.medications || [], // Carregar Medicações
      photos: client.photos || [], vaccineDocs: client.vaccineDocs || [], vaccines: client.vaccines, 
      lastAntiRabica: client.lastAntiRabica || '',
      lastMultipla: client.lastMultipla || '',
      pastBookings: client.pastBookings || [] 
    }));
    setSearchQuery(''); setShowSearchResults(false);
  };
  
  const removePhoto = (index, type) => {
      if (type === 'photos') {
        setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
      } else {
        setFormData(prev => ({ ...prev, vaccineDocs: prev.vaccineDocs.filter((_, i) => i !== index) }));
      }
  };
  const removeSocialDog = (name) => setFormData(prev => ({ ...prev, socialization: prev.socialization.filter(d => d !== name) }));
  
  const handleSubmit = async (e) => { 
      e.preventDefault(); 
      setIsSaving(true);
      await onSave(formData);
      setIsSaving(false);
  };
  
  const openWhatsApp = (number) => {
    if (!number) return;
    const cleanNumber = number.replace(/\D/g, '');
    const finalNumber = (cleanNumber.length === 10 || cleanNumber.length === 11) ? `55${cleanNumber}` : cleanNumber;
    window.open(`https://wa.me/${finalNumber}`, '_blank');
  };
  
  const availableDogs = clientDatabase.map(c => c.dogName).filter(n => n !== formData.dogName);
  const searchResults = searchQuery ? clientDatabase.filter(c => c.dogName.toLowerCase().includes(searchQuery.toLowerCase()) || c.ownerName.toLowerCase().includes(searchQuery.toLowerCase())) : [];
  const getTitle = () => { if (mode === 'client_new') return 'Novo Cadastro'; if (mode === 'client_edit') return 'Editar Cadastro'; return data ? 'Editar Hospedagem' : 'Nova Hospedagem'; };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 md:p-4 overflow-y-auto">
      {/* Lightbox Fotos Cão */}
      {lightboxIndex >= 0 && (
          <ImageLightbox 
              images={formData.photos || []} 
              currentIndex={lightboxIndex} 
              setIndex={setLightboxIndex} 
              onClose={() => setLightboxIndex(-1)} 
          />
      )}
      {/* Lightbox Vacinas */}
      {vaccineLightboxIndex >= 0 && (
          <ImageLightbox 
              images={formData.vaccineDocs || []} 
              currentIndex={vaccineLightboxIndex} 
              setIndex={setVaccineLightboxIndex} 
              onClose={() => setVaccineLightboxIndex(-1)} 
          />
      )}

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col">
        <div className="bg-[#0000FF] px-6 py-4 flex justify-between items-center sticky top-0 z-10"><h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><FileText /> {getTitle()}</h2><button onClick={onClose} className="text-white hover:bg-[#0000AA] rounded-full p-1"><X size={24} /></button></div>
        {isBookingMode && !data && (
            <div className="bg-indigo-50 px-6 py-3 border-b border-indigo-100"><label className="block text-sm font-bold text-indigo-800 mb-1">Já é cliente?</label><div className="relative"><div className="flex gap-2"><div className="relative flex-1"><input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }} placeholder="Buscar cliente..." className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0000FF]"/><Search className="absolute left-3 top-2.5 text-[#0000FF]" size={18} /></div></div>{showSearchResults && searchQuery && (<div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-lg mt-1 border z-20 max-h-60 overflow-y-auto">{searchResults.length > 0 ? ( searchResults.map(client => ( <button key={client.id} type="button" onClick={() => selectClient(client)} className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b last:border-0 flex justify-between items-center"><div><span className="font-bold text-gray-800">{client.dogName}</span><span className="text-sm text-gray-500 ml-2">- {client.ownerName}</span></div><span className="text-xs text-[#0000FF] bg-indigo-100 px-2 py-1 rounded-full">Selecionar</span></button> )) ) : ( <div className="p-3 text-gray-500 text-sm flex items-center gap-2"><AlertCircle size={16} /> Nenhum cliente encontrado.</div> )}</div>)}</div></div>
        )}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-[#0000FF] font-bold border-b pb-2 flex items-center gap-2"><Dog size={18}/> Dados do Pet</h3>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Nome</label><input required name="dogName" value={formData.dogName} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#0000FF] outline-none" /></div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Porte</label>
                    <select name="dogSize" value={formData.dogSize} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg outline-none bg-white">
                        <option value="Pequeno">Pequeno</option>
                        <option value="Médio">Médio</option>
                        <option value="Grande">Grande</option>
                        <option value="Gigante">Gigante</option>
                    </select>
                </div>
            </div>
            <div className='grid grid-cols-3 gap-4'>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Ano de Nasc.</label>
                    <select 
                        required 
                        name="birthYear" 
                        value={formData.birthYear} 
                        onChange={handleChange} 
                        className="mt-1 w-full p-2 border rounded-lg outline-none bg-white"
                    >
                        <option value="" disabled>Selecione o ano</option>
                        {generateYearOptions().map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-500">Idade (Real)</label><input type="text" readOnly value={realAgeYears > 0 ? `${realAgeYears} anos` : '-'} className="mt-1 w-full p-2 border rounded-lg bg-gray-100 text-gray-600 font-bold outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-500">Idade (Humana)</label><input type="text" readOnly value={humanAge > 0 ? `${humanAge} anos` : '-'} className="mt-1 w-full p-2 border rounded-lg bg-[#FF7F00]/10 text-[#FF7F00] font-bold outline-none border-[#FF7F00]/30" /></div>
            </div>
            {/* CAMPO DE RAÇA */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Raça</label>
                <select name="dogBreed" value={formData.dogBreed} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg outline-none bg-white">
                    {races.sort((a, b) => a.name.localeCompare(b.name))
                        .filter(race => race.name && race.id)
                        .map(race => (
                            <option key={race.id} value={race.name}>{race.name}</option>
                        ))}
                </select>
                <div className='mt-2 flex gap-2'>
                    <input 
                        type="text" 
                        value={newRace} 
                        onChange={(e) => setNewRace(e.target.value)} 
                        placeholder="Nova Raça" 
                        className="flex-1 p-2 border rounded-lg outline-none text-sm"
                    />
                    <button type="button" onClick={handleAddRace} disabled={!newRace} className="bg-[#00AA00] text-white px-3 py-1 rounded-lg hover:bg-[#00FF00] disabled:opacity-50 font-bold text-sm">
                        + Incluir
                    </button>
                </div>
            </div>
            
            {/* NOVO SETOR: MEDICAÇÕES */}
            <div className="space-y-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <h3 className="text-[#FF0000] font-bold border-b border-red-300 pb-2 flex items-center gap-2"><Pill size={18}/> Medicações</h3>
                
                {/* Formulário de Nova Medicação */}
                <div className='grid grid-cols-6 gap-2'>
                    <div className="col-span-2"><input type="text" name="name" value={newMedication.name} onChange={handleMedicationChange} placeholder="Nome da medicação" className="w-full p-2 border rounded-lg text-sm outline-none" /></div>
                    <div className="col-span-2"><input type="text" name="dosage" value={newMedication.dosage} onChange={handleMedicationChange} placeholder="Dosagem" className="w-full p-2 border rounded-lg text-sm outline-none" /></div>
                    <div className="col-span-1"><input type="text" name="time" value={newMedication.time} onChange={handleMedicationChange} placeholder="Horário" className="w-full p-2 border rounded-lg text-sm outline-none" /></div>
                    <button type="button" onClick={handleAddMedication} disabled={!(newMedication.name && newMedication.dosage && newMedication.time)} className="col-span-1 bg-[#FF0000] text-white rounded-lg hover:bg-[#AA0000] disabled:opacity-50 font-bold text-sm flex items-center justify-center p-2">
                        <Plus size={16}/>
                    </button>
                </div>

                {/* Lista de Medicações Atuais */}
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {formData.medications.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">Nenhuma medicação registrada.</p>
                    ) : (
                        formData.medications.map((med, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-2 rounded shadow-sm border border-red-100">
                                <div className='text-sm text-gray-800'>
                                    <span className="font-bold">{med.name}</span> ({med.dosage})
                                    <span className='ml-2 text-xs text-[#FF7F00] font-medium'>às {med.time}</span>
                                </div>
                                <button type="button" onClick={() => handleRemoveMedication(index)} className="text-red-500 hover:text-[#AA0000] p-1 rounded-full transition">
                                    <X size={14}/>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Comportamento / Obs</label><textarea name="history" value={formData.history} onChange={handleChange} rows={2} className="mt-1 w-full p-2 border rounded-lg outline-none text-sm" placeholder="Histórico do cão..."></textarea></div>
            
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <label className="block text-sm font-bold text-[#0000FF] mb-2">Avaliação Geral do Cão</label>
                <FaceRating rating={formData.dogBehaviorRating} setRating={(r) => setFormData({...formData, dogBehaviorRating: r})} />
            </div>

            <div><label className="block text-sm font-medium text-gray-700 flex items-center gap-2"><Heart size={14} className="text-[#E91E63]"/> Socialização</label><div className="flex gap-2 mb-2 mt-1"><select value={socialDogInput} onChange={(e) => setSocialDogInput(e.target.value)} className="flex-1 p-2 border rounded-lg text-sm"><option value="">+ Amigo</option>{availableDogs.map(d => <option key={d} value={d}>{d}</option>)}</select><button type="button" onClick={handleAddSocialDog} disabled={(formData.socialization || []).length >= 5 || !socialDogInput} className="bg-pink-100 text-[#E91E63] px-3 rounded-lg hover:bg-pink-200 disabled:opacity-50 font-bold">+</button></div><div className="flex flex-wrap gap-2">{(formData.socialization || []).map((dog, index) => ( <span key={index} className="bg-pink-50 text-[#E91E63] px-2 py-1 rounded-full text-xs flex items-center gap-1 border border-pink-100">{dog} <button type="button" onClick={() => removeSocialDog(dog)} className="hover:text-[#FF0000]"><X size={12}/></button></span> ))}</div></div>
            <div><label className="block text-sm font-medium text-gray-700">Restrições</label><input name="restrictions" value={formData.restrictions} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg border-[#FF0000]/30 bg-[#FF0000]/5 outline-none" placeholder="Ex: Alergias..." /></div>
            <div className="mt-4 bg-[#00FF00]/10 p-3 rounded-lg border border-[#00FF00]/30">
                <h4 className="text-sm font-bold text-[#00AA00] flex items-center gap-1"><DollarSign size={16} /> Total Pago por {formData.dogName}</h4>
                <p className="text-2xl font-extrabold text-[#00AA00] mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaidValue)}</p>
                <p className="text-xs text-[#00AA00] mt-1">Total acumulado (Valor Real Debitado) em {formData.pastBookings.length} hospedagens.</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[#0000FF] font-bold border-b pb-2 flex items-center gap-2"><User size={18}/> Dados do Tutor</h3>
            <div className="bg-gray-50 p-3 rounded-lg border space-y-3">
              
              {/* TUTOR 1 */}
              <div className="border border-gray-300 p-3 rounded-lg bg-white space-y-2">
                <h4 className="font-bold text-sm text-gray-700">Tutor 1 (Principal)</h4>
                <div><label className="block text-sm font-medium text-gray-700">Nome Completo</label><input required name="ownerName" value={formData.ownerName} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg outline-none" /></div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-1"><MessageCircle size={16} className="text-[#00AA00]"/> WhatsApp 1</label>
                    <div className="flex gap-2 mt-1">
                        <input name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="flex-1 p-2 border rounded-lg outline-none" placeholder="(00) 00000-0000" />
                        <button type="button" onClick={() => openWhatsApp(formData.whatsapp)} disabled={!formData.whatsapp} className={`p-2 rounded-lg text-white transition ${!formData.whatsapp ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#00AA00] hover:bg-[#00FF00]'}`} title="Abrir WhatsApp 1">
                            <MessageCircle size={20} />
                        </button>
                    </div>
                </div>
              </div>

              {/* TUTOR 2 */}
              <div className="border border-gray-300 p-3 rounded-lg bg-white space-y-2">
                <h4 className="font-bold text-sm text-gray-700">Tutor 2 (Alternativo)</h4>
                <div><label className="block text-sm font-medium text-gray-700">Nome Completo</label><input name="ownerName2" value={formData.ownerName2} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg outline-none" /></div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-1"><MessageCircle size={16} className="text-[#00AA00]"/> WhatsApp 2</label>
                    <div className="flex gap-2 mt-1">
                        <input name="whatsapp2" value={formData.whatsapp2} onChange={handleChange} className="flex-1 p-2 border rounded-lg outline-none" placeholder="(00) 00000-0000" />
                        <button type="button" onClick={() => openWhatsApp(formData.whatsapp2)} disabled={!formData.whatsapp2} className={`p-2 rounded-lg text-white transition ${!formData.whatsapp2 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#00AA00] hover:bg-[#00FF00]'}`} title="Abrir WhatsApp 2">
                            <MessageCircle size={20} />
                        </button>
                    </div>
                </div>
              </div>
              
              {/* CAMPO CAPTAÇÃO */}
              <div>
                  <label className="block text-sm font-medium text-gray-700">Captação</label>
                  <select name="source" value={formData.source} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg outline-none bg-white">
                      <option value="Particular">Particular</option>
                      <option value="DogHero">DogHero</option>
                  </select>
              </div>

              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Avaliação Geral do Tutor</label>
                    <FaceRating rating={formData.ownerRating} setRating={(r) => setFormData({...formData, ownerRating: r})} size={20} />
                </div>
                <textarea name="ownerHistory" value={formData.ownerHistory} onChange={handleChange} rows={2} className="w-full p-2 border rounded-lg outline-none text-sm bg-white" placeholder="Histórico do tutor..."></textarea>
              </div>
            </div>
            {isBookingMode && (
                <div className="space-y-2 animate-fade-in">
                    <h3 className="text-[#00AA00] font-bold border-b border-green-200 pb-2 flex items-center gap-2 mt-4"><DollarSign size={18}/> Dados da Hospedagem</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-gray-500">Check-in</label><input required type="datetime-local" name="checkIn" value={formData.checkIn} onChange={handleChange} className="w-full p-1.5 border rounded outline-none text-sm" /></div>
                        <div><label className="block text-xs text-gray-500">Check-out</label><input required type="datetime-local" name="checkOut" value={formData.checkOut} onChange={handleChange} className="w-full p-1.5 border rounded outline-none text-sm" /></div>
                        <div><label className="block text-xs text-gray-500">Diária (R$)</label><input required type="number" name="dailyRate" value={formData.dailyRate} onChange={handleChange} className="w-full p-1.5 border rounded outline-none font-bold text-[#00AA00]" /></div>
                        <div><label className="block text-xs text-gray-500">Total Estimado</label><div className="w-full p-1.5 bg-[#00FF00]/10 border border-[#00FF00]/30 rounded text-[#00AA00] font-bold text-sm">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalValue)}</div></div>
                    </div>
                    <div className="mt-2 border-t pt-2">
                        <label className="block text-sm font-bold text-[#FF0000] mb-1 flex items-center gap-1"><AlertTriangle size={14}/> Prejuízos / Danos (R$)</label>
                        <div className="grid grid-cols-2 gap-4"><input type="number" name="damageValue" value={formData.damageValue} onChange={handleChange} placeholder="Valor do prejuízo" className="w-full p-1.5 border border-[#FF0000]/30 bg-[#FF0000]/5 rounded outline-none text-sm font-bold text-[#FF0000]" /><input type="text" name="damageDescription" value={formData.damageDescription} onChange={handleChange} placeholder="Motivo (ex: rasgou cama)" className="w-full p-1.5 border border-[#FF0000]/30 bg-[#FF0000]/5 rounded outline-none text-sm" /></div>
                    </div>
                    <div className="mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <label className="block text-sm font-bold text-[#0000FF] mb-1 flex items-center gap-1"><Star size={14}/> Avaliação da Hospedagem</label>
                        <StarRating rating={formData.rating} setRating={(r) => setFormData({...formData, rating: r})} />
                    </div>
                </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-4 border-t pt-4">
            {/* HISTÓRICO (MANTIDO IGUAL) */}
            <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-gray-700 font-bold flex items-center gap-2 mb-2"><History size={18} /> Histórico de Hospedagens ({formData.pastBookings.length})</h3>
                {formData.pastBookings.length === 0 ? ( <p className="text-gray-400 text-sm italic">Nenhum histórico registrado.</p> ) : (
                    <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                    {formData.pastBookings.map((hosp, idx) => {
                        const totalValue = parseFloat(hosp.totalValue) || 0;
                        const damageValue = parseFloat(hosp.damageValue) || 0;
                        const realDebitedValue = totalValue - damageValue;
                        const hasDamage = damageValue > 0;

                        return (
                            <div key={idx} className="text-xs bg-white p-3 rounded border shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className='flex-1'>
                                        <span className="font-bold block text-gray-700">{new Date(hosp.checkIn).toLocaleDateString('pt-BR')} até {new Date(hosp.checkOut).toLocaleDateString('pt-BR')}</span>
                                        <div className="text-gray-500 italic mt-1">{hosp.observation}</div>
                                        {hasDamage && <div className="text-[#FF0000] font-bold mt-1 text-[11px] flex items-center gap-1"><AlertCircle size={12}/> Obs. Prejuízo: {hosp.damageDescription}</div>}
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <div className="flex items-center gap-1"><span className="font-bold text-gray-500">Hospedagem:</span> <StarRating rating={hosp.rating} readonly size={12} /></div>
                                        <div className="flex items-center gap-1 mt-1"><span className="font-bold text-gray-500">Cão Comp.:</span> <FaceRating rating={hosp.dogBehaviorRating} readonly size={12} /></div>
                                        <div className="flex items-center gap-1 mt-1"><span className="font-bold text-gray-500">Tutor Aval.:</span> <FaceRating rating={hosp.ownerRating} readonly size={12} /></div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center border-t pt-2 mt-1">
                                    <div className='text-sm font-medium text-gray-600'>
                                        Valor da Hospedagem: <span className='font-bold text-[#0000FF]'>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</span>
                                    </div>
                                    <div className='text-right'>
                                        {hasDamage && (
                                            <div className="text-xs font-bold text-[#FF0000]">
                                                Prejuízo: - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(damageValue)}
                                            </div>
                                        )}
                                        <div className="text-sm font-bold text-[#00AA00]">
                                            Valor Real Debitado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(realDebitedValue)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                )}
            </div>
            
            {/* GALERIA DE FOTOS */}
            <h3 className="text-[#0000FF] font-bold border-b pb-2 flex items-center gap-2"><Camera size={18}/> Galeria do Pet</h3>
            <div className="flex gap-2 mb-2 items-center">
               <label className={`flex-1 cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300 rounded-lg p-2 flex items-center justify-center gap-2 transition ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                   {isUploading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0000FF]"></div><span className="text-sm font-medium">Enviando...</span></> : <><Upload size={20} /><span className="text-sm font-medium">Adicionar Foto</span></>}
                   <input 
                       type="file" 
                       // Configuração para abrir o menu de escolha nativo (Câmera ou Galeria)
                       accept="image/*" 
                       className="hidden" 
                       onChange={(e) => handleFileSelect(e, 'photos')}
                       disabled={(formData.photos || []).length >= 5 || isUploading}
                   />
               </label>
               <div className="text-xs text-gray-400 w-24 text-center">
                   {(formData.photos || []).length}/5 fotos
               </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 min-h-[90px]">
                {(formData.photos || []).length === 0 && <p className="text-sm text-gray-400 italic p-2">Nenhuma foto adicionada.</p>}
                {(formData.photos || []).map((url, idx) => ( 
                <div key={idx} className="relative w-20 h-20 flex-shrink-0 group">
                    <img 
                        src={url} 
                        alt="Pet" 
                        className="w-full h-full object-cover rounded-lg shadow-md cursor-zoom-in hover:opacity-90 transition" 
                        onClick={() => setLightboxIndex(idx)}
                    />
                    <button 
                        type="button" 
                        onClick={() => removePhoto(idx, 'photos')} 
                        className="absolute -top-2 -right-2 bg-[#FF0000] text-white rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition"
                    >
                        <X size={10} />
                    </button>
                </div> 
            ))}</div>

            {/* DOCUMENTOS DE VACINA */}
            <h3 className="text-[#0000FF] font-bold border-b pb-2 flex items-center gap-2 mt-4"><FilePlus size={18}/> Documentos de Vacinas</h3>
            <div className="flex gap-2 mb-2 items-center">
               <label className={`flex-1 cursor-pointer bg-[#0000FF]/10 hover:bg-[#0000FF]/20 text-[#0000FF] border border-[#0000FF]/30 rounded-lg p-2 flex items-center justify-center gap-2 transition ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                   {isUploading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0000FF]"></div><span className="text-sm font-medium">Enviando...</span></> : <><Upload size={20} /><span className="text-sm font-medium">Adicionar Vacina (Foto/PDF)</span></>}
                   <input 
                       type="file" 
                       accept="image/*,application/pdf" 
                       className="hidden" 
                       onChange={(e) => handleFileSelect(e, 'vaccines')}
                       disabled={(formData.vaccineDocs || []).length >= 3 || isUploading}
                   />
               </label>
               <div className="text-xs text-gray-400 w-24 text-center">
                   {(formData.vaccineDocs || []).length}/3 docs
               </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 min-h-[90px]">
                {(formData.vaccineDocs || []).length === 0 && <p className="text-sm text-gray-400 italic p-2">Nenhum comprovante de vacina.</p>}
                {(formData.vaccineDocs || []).map((url, idx) => {
                    const isPdf = url.toLowerCase().includes('.pdf');
                    return (
                    <div key={idx} className="relative w-20 h-20 flex-shrink-0 group">
                        {isPdf ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center bg-[#FF0000]/5 border-2 border-[#FF0000]/20 rounded-lg shadow-md hover:bg-[#FF0000]/10 transition" title="Abrir PDF">
                                <FileText className="text-[#FF0000]" size={32} />
                                <span className="text-[8px] text-[#FF0000] font-bold mt-1">PDF</span>
                            </a>
                        ) : (
                            <img 
                                src={url} 
                                alt="Vacina" 
                                className="w-full h-full object-cover rounded-lg shadow-md cursor-zoom-in hover:opacity-90 transition border-2 border-[#0000FF]/20" 
                                onClick={() => setVaccineLightboxIndex(idx)}
                            />
                        )}
                        <button 
                            type="button" 
                            onClick={() => removePhoto(idx, 'vaccines')} 
                            className="absolute -top-2 -right-2 bg-[#FF0000] text-white rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition"
                        >
                            <X size={10} />
                        </button>
                    </div> 
                )})}</div>

            {/* ÚLTIMAS VACINAS - NOVO SETOR */}
            <h3 className="text-[#0000FF] font-bold border-b pb-2 flex items-center gap-2 mt-4"><Calendar size={18}/> Últimas Vacinas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anti-Rábica</label>
                    <input 
                        type="date" 
                        name="lastAntiRabica" 
                        value={formData.lastAntiRabica} 
                        onChange={handleChange} 
                        className="w-full p-2 border rounded-lg outline-none" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Múltipla V8 / V10</label>
                    <input 
                        type="date" 
                        name="lastMultipla" 
                        value={formData.lastMultipla} 
                        onChange={handleChange} 
                        className="w-full p-2 border rounded-lg outline-none" 
                    />
                </div>
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-4 pt-4 border-t">
             <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">Cancelar</button>
             <button type="submit" className="px-6 py-2 rounded-lg bg-[#0000FF] text-white hover:bg-[#0000AA] font-bold shadow-lg flex items-center gap-2" disabled={isSaving}>{isSaving ? 'Salvando...' : <><CheckCircle size={18} /> {isBookingMode ? 'Confirmar Reserva' : 'Salvar Cadastro'}</>}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- App Principal (Main Component) ---
export default function DogHotelApp() {
    const [isAuthenticated, setIsAuthenticated] = useState(false); 
    const [user, setUser] = useState(null);
  
    const [activeTab, setActiveTab] = useState('agenda');
    const [clientDatabase, setClientDatabase] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [races, setRaces] = useState([]); // Novo estado para raças
    
    const [view, setView] = useState('day'); 
    // CORRIGIDO: Inicializa currentDate com useState
    const [currentDate, setCurrentDate] = useState(new Date()); 

    // Garante que o estado inicial de currentDate comece no início do dia
    useEffect(() => {
        setCurrentDate(prev => {
            const startOfDay = new Date(prev);
            startOfDay.setHours(0, 0, 0, 0);
            return startOfDay;
        });
    }, []);

    const [financialView, setFinancialView] = useState('monthly'); 
    const [finSelectedMonth, setFinSelectedMonth] = useState(new Date().getMonth());
    const [finSelectedYear, setFinSelectedYear] = useState(new Date().getFullYear());
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState(null);
    const [modalMode, setModalMode] = useState('booking');

    const DEFAULT_RACES = [
        "Sem Raça Definida (SRD)", "Shih Tzu", "Yorkshire Terrier", "Spitz Alemão (Lulu da Pomerânia)", 
        "Lhasa Apso", "Golden Retriever", "Pinscher", "Dachshund (Salsicha)", "Pug", "Maltês", 
        "Poodle", "Bulldog Francês", "Pastor Alemão", "Labrador Retriever", "Border Collie", 
        "Rottweiler", "Husky Siberiano", "Chihuahua", "Pastor Belga Malinois", "Staffordshire Bull Terrier", 
        "Jack Russell", "Pitbull", "Dogue Alemão", "São Bernardo"
    ];
  
    useEffect(() => {
      const initAuth = async () => {
        try {
          // No ambiente de preview, usamos signInWithCustomToken se disponível
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try {
                // ATENÇÃO: Corrigido o nome da variável de __initial_auth_token
                await signInWithCustomToken(auth, __initial_auth_token); 
                return;
            } catch (error) {
                console.warn("Falha no token customizado, tentando anônimo:", error);
            }
          } 
          
          await signInAnonymously(auth);
          
        } catch (error) {
          console.error("Erro de autenticação no Firebase:", error);
          alert("Erro ao conectar com o servidor. Verifique se a Autenticação Anônima está ativada no painel do Firebase.");
        }
      };
      initAuth();
      const unsubscribe = onAuthStateChanged(auth, setUser);
      return () => unsubscribe();
    }, []);

    // UseEffect para garantir a criação do registro inicial de login E Raças padrão
    useEffect(() => {
        const ensureDefaultData = async () => {
            if (!user) return;

            // 1. Garantir Login Padrão
            const loginsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logins');
            const qLogin = query(loginsRef, where("email", "==", "lyoni.berbert@gmail.com"));
            
            try {
                const snapshot = await getDocs(qLogin);
                if (snapshot.empty) {
                    await addDoc(loginsRef, {
                        email: "lyoni.berbert@gmail.com",
                        password: "admin@2015#!novo"
                    });
                    console.log("Usuário padrão criado com sucesso.");
                }
            } catch (error) {
                console.error("Erro ao verificar/criar usuário padrão:", error);
            }
            
            // 2. Garantir Raças Padrão
            const racesRef = collection(db, 'artifacts', appId, 'public', 'data', 'races');
            const qRaces = query(racesRef); // Tenta buscar qualquer raça
            
            try {
                const snapshot = await getDocs(qRaces);
                if (snapshot.empty) {
                    for (const raceName of DEFAULT_RACES) {
                        await addDoc(racesRef, { name: raceName });
                    }
                    console.log("Raças padrão criadas com sucesso.");
                }
            } catch (error) {
                console.error("Erro ao verificar/criar raças padrão:", error);
            }
        };

        ensureDefaultData();
    }, [user]);
  
    // MODIFICADO: UseEffect agora usa rota pública 'public/data' para todos os dados
    useEffect(() => {
      if (!user) return;
      // Rotas públicas para garantir compartilhamento e evitar bloqueio de regras
      const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
      const bookingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
      const racesRef = collection(db, 'artifacts', appId, 'public', 'data', 'races'); // Listener para Raças
  
      const unsubscribeClients = onSnapshot(clientsRef, (snapshot) => {
        const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClientDatabase(clientsData);
      }, (error) => {
          console.error("Erro ao carregar clientes:", error);
      });
  
      const unsubscribeBookings = onSnapshot(bookingsRef, (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBookings(bookingsData);
      }, (error) => {
          console.error("Erro ao carregar reservas:", error);
      });

      const unsubscribeRaces = onSnapshot(racesRef, (snapshot) => {
        const racesData = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setRaces(racesData);
      }, (error) => {
          console.error("Erro ao carregar raças:", error);
      });
  
      return () => { unsubscribeClients(); unsubscribeBookings(); unsubscribeRaces(); };
    }, [user]);
  
    // Função para adicionar nova raça
    const handleAddRace = async (newRaceName) => {
        if (!user || !newRaceName) return;
        const racesRef = collection(db, 'artifacts', appId, 'public', 'data', 'races');
        await addDoc(racesRef, { name: newRaceName });
    };
    
    // NOVO HELPER: Combina Bookings com Client Data (para injetar a foto)
    const getBookingsWithClientData = (bookings, clients) => {
        return bookings.map(booking => {
            const client = clients.find(c => c.id === booking.clientId);
            const clientPhoto = client?.photos?.[0] || null; // Pega a primeira foto do cliente
            return {
                ...booking,
                clientPhoto: clientPhoto, // Injeta a URL da foto no objeto booking
            };
        });
    };


    if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} db={db} appId={appId} isDbReady={!!user} />;
  
    // --- Helpers ---
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const startOfWeek = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      return new Date(d.setDate(diff));
    };
    const formatDateBR = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('pt-BR');
    };
    const navigateDate = (direction) => {
      const newDate = new Date(currentDate);
      if (view === 'day') newDate.setDate(newDate.getDate() + direction);
      if (view === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
      if (view === 'month') newDate.setMonth(newDate.getMonth() + direction);
      setCurrentDate(newDate);
    };
    const isSameDate = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  
    // --- Handlers ---
    const handleOpenBookingModal = (booking = null) => { setEditingData(booking); setModalMode('booking'); setIsModalOpen(true); };
    const handleOpenClientModal = (client = null) => { setEditingData(client); setModalMode(client ? 'client_edit' : 'client_new'); setIsModalOpen(true); };
    
    // MODIFICADO: Delete agora remove da rota pública
    const handleDeleteBooking = async (id) => { 
      if (window.prompt("Para confirmar a exclusão da reserva, digite 'DELETAR'") === 'DELETAR') {
        if (user) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id));
      }
    };
    
    // MODIFICADO: Delete agora remove da rota pública
    const handleDeleteClient = async (id) => { 
      if (window.prompt("Para confirmar a exclusão do cliente, digite 'DELETAR'") === 'DELETAR') {
        if (user) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', id));
      }
    };
    
    const handleLogout = () => { 
      if (window.prompt("Para sair do sistema, digite 'SAIR'") === 'SAIR') setIsAuthenticated(false); 
    };
  
    // --- CRUD Principal ---
    // Inclui a validação de duplicidade na criação de novos clientes
    const handleSave = async (formData) => {
      if (!user) {
          alert("Erro Crítico: Você não está conectado ao banco de dados.");
          return;
      }
      
      const isNewClient = !formData.clientId;

      if (isNewClient && (modalMode === 'client_new' || modalMode === 'booking')) {
          const dogName = (formData.dogName || '').trim().toLowerCase();
          
          // Limpa e normaliza os números de WhatsApp
          const newWhatsapp1 = (formData.whatsapp || '').replace(/\D/g, '').trim();
          const newWhatsapp2 = (formData.whatsapp2 || '').replace(/\D/g, '').trim();

          const isDuplicate = clientDatabase.some(client => {
              // Condição 1: Mesma chave "Nome do Pet"
              const existingDogName = (client.dogName || '').trim().toLowerCase();
              if (existingDogName !== dogName) {
                  return false;
              }

              // Condição 2: E (WhatsApp 1 OU WhatsApp 2 do novo cadastro coincide com WhatsApp 1 OU WhatsApp 2 do cliente existente)
              const existingWhatsapp1 = (client.whatsapp || '').replace(/\D/g, '').trim();
              const existingWhatsapp2 = (client.whatsapp2 || '').replace(/\D/g, '').trim();

              const whatsappMatch = (
                  // Novo WA1 coincide com Existente WA1 ou WA2
                  (newWhatsapp1 && (newWhatsapp1 === existingWhatsapp1 || newWhatsapp1 === existingWhatsapp2)) ||
                  // Novo WA2 coincide com Existente WA1 ou WA2
                  (newWhatsapp2 && (newWhatsapp2 === existingWhatsapp1 || newWhatsapp2 === existingWhatsapp2))
              );
              
              // Se o nome do pet coincidir E houver qualquer coincidência de WhatsApp (1 ou 2)
              return whatsappMatch;
          });

          if (isDuplicate) {
              // MENSAGEM DE ERRO ESPECÍFICA SOLICITADA E RETORNO
              alert(`Erro de Duplicidade no Cadastro:
Não é possível salvar um novo registro com o nome de pet "${formData.dogName}".

Um pet com esse mesmo nome já está cadastrado e vinculado a um dos números de WhatsApp fornecidos (Tutor 1 ou Tutor 2).

Verifique o cadastro existente.`);
              return; 
          }
      }

      try {
          let clientId = formData.clientId;
          const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
          
          // A verificação de cliente existente abaixo é para EDITAR um cadastro ou VINCULAR uma nova reserva a um cliente existente.
          const existingClient = !clientId 
          ? clientDatabase.find(c => (c.dogName || '').toLowerCase() === (formData.dogName || '').toLowerCase() && (c.ownerName || '').toLowerCase() === (formData.ownerName || '').toLowerCase())
          : clientDatabase.find(c => c.id === clientId);
  
          // Note: ownerEmail, ownerDoc, address estão nos dados, mas são ignorados no formulário
          const clientDataToSave = {
          dogName: formData.dogName, dogSize: formData.dogSize, dogBreed: formData.dogBreed, 
          source: formData.source, // Salvar Captação
          ownerName: formData.ownerName, ownerName2: formData.ownerName2, 
          whatsapp: formData.whatsapp, whatsapp2: formData.whatsapp2, // Salvar Tutor 2
          ownerEmail: formData.ownerEmail,
          ownerDoc: formData.ownerDoc,
          address: formData.address, birthYear: formData.birthYear, history: formData.history,
          ownerHistory: formData.ownerHistory, ownerRating: formData.ownerRating, restrictions: formData.restrictions,
          socialization: formData.socialization || [], 
          medications: formData.medications || [], // Salvar Medicações
          photos: formData.photos || [], 
          vaccineDocs: formData.vaccineDocs || [],
          vaccines: formData.vaccines,
          lastAntiRabica: formData.lastAntiRabica,
          lastMultipla: formData.lastMultipla,
          dogBehaviorRating: formData.dogBehaviorRating,
          };
  
          let bookingSummary = null;
          if (modalMode === 'booking') {
              bookingSummary = {
              id: Date.now() + '_hist',
              checkIn: formData.checkIn,
              checkOut: formData.checkOut,
              observation: `Hospedagem`,
              rating: formData.rating, dogBehaviorRating: formData.dogBehaviorRating, ownerRating: formData.ownerRating,
              dailyRate: formData.dailyRate, totalValue: parseFloat(formData.totalValue) || 0,
              damageValue: parseFloat(formData.damageValue) || 0, damageDescription: formData.damageDescription || ''
              };
          }
  
          if (existingClient) {
          clientId = existingClient.id;
          const clientDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientId);
          const newPastBookings = modalMode === 'booking' 
              ? [bookingSummary, ...(existingClient.pastBookings || [])] 
              : (existingClient.pastBookings || []);
          await updateDoc(clientDocRef, { ...clientDataToSave, pastBookings: newPastBookings });
          } else {
          const newClientData = { ...clientDataToSave, pastBookings: modalMode === 'booking' ? [bookingSummary] : [] };
          const docRef = await addDoc(clientsRef, newClientData);
          clientId = docRef.id;
          }
  
          if (modalMode === 'booking') {
              const bookingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
              const bookingData = { ...formData, clientId: clientId };
              if (editingData && editingData.id) {
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', editingData.id), bookingData);
              } else {
              await addDoc(bookingsRef, bookingData);
              }
          }
  
          setIsModalOpen(false); setEditingData(null);
  
      } catch (error) {
          console.error("Erro ao salvar:", error);
          alert(`Erro ao salvar os dados: ${error.message}.`);
      }
    };
  
    // --- Filtros e Calculos ---
    const getBookingsForDate = (date) => {
        // Usa a função de mapeamento antes de filtrar
        const allBookingsWithData = getBookingsWithClientData(bookings, clientDatabase); 
        
        return allBookingsWithData.filter(b => {
            if (!b.checkIn || !b.checkOut) return false;
            const start = new Date(b.checkIn).setHours(0,0,0,0);
            const end = new Date(b.checkOut).setHours(23,59,59,999);
            const current = new Date(date).setHours(12,0,0,0);
            return current >= start && current <= end;
        });
    }

    const getFilteredClients = () => {
      if (!clientSearchTerm) return clientDatabase;
      const term = clientSearchTerm.toLowerCase();
      return clientDatabase.filter(client => 
        (client.dogName || '').toLowerCase().includes(term) || 
        (client.ownerName || '').toLowerCase().includes(term)
      );
    };
    const calculateMonthlyNetTotal = (month, year) => {
        const allBookingsWithData = getBookingsWithClientData(bookings, clientDatabase);
        
        return allBookingsWithData.filter(b => {
          if (!b.checkIn) return false;
          const d = new Date(b.checkIn);
          return d.getMonth() === month && d.getFullYear() === year;
      }).reduce((acc, curr) => {
          const revenue = parseFloat(curr.totalValue) || 0;
          const damage = parseFloat(curr.damageValue) || 0;
          return acc + (revenue - damage);
      }, 0);
    };
    const getBookingsByMonth = (month, year) => {
        const allBookingsWithData = getBookingsWithClientData(bookings, clientDatabase);

        return allBookingsWithData.filter(b => {
          if (!b.checkIn) return false;
          const d = new Date(b.checkIn);
          return d.getMonth() === month && d.getFullYear() === year;
      }).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
    }
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
    // --- Renders ---
    const renderFinancial = () => (
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 min-h-[500px] animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><PieChart className="text-[#0000FF]"/> Painel Financeiro</h2>
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
            <button onClick={() => setFinancialView('monthly')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition ${financialView === 'monthly' ? 'bg-white shadow text-[#0000FF]' : 'text-gray-600'}`}>Mensal</button>
            <button onClick={() => setFinancialView('annual')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition ${financialView === 'annual' ? 'bg-white shadow text-[#0000FF]' : 'text-gray-600'}`}>Anual</button>
          </div>
        </div>
        {financialView === 'monthly' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center bg-[#0000FF]/5 p-4 rounded-xl border border-[#0000FF]/10">
              <div className="flex items-center gap-2"><label className="font-bold text-[#0000FF]">Ano:</label><select value={finSelectedYear} onChange={(e) => setFinSelectedYear(parseInt(e.target.value))} className="p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0000FF]">{[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div className="flex items-center gap-2"><label className="font-bold text-[#0000FF]">Mês:</label><select value={finSelectedMonth} onChange={(e) => setFinSelectedMonth(parseInt(e.target.value))} className="p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0000FF]">{monthNames.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}</select></div>
            </div>
            <div className="bg-gradient-to-r from-[#00AA00] to-[#00FF00] rounded-2xl p-6 text-white shadow-lg">
              <div className="flex justify-between items-center">
                <div><p className="text-green-100 text-sm font-medium uppercase tracking-wider">Lucro Líquido (Valor Real) - {monthNames[finSelectedMonth]}/{finSelectedYear}</p><h3 className="text-4xl font-bold mt-2">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateMonthlyNetTotal(finSelectedMonth, finSelectedYear))}</h3></div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full"><DollarSign size={32} className="text-white" /></div>
              </div>
            </div>
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b"><tr><th className="p-3 font-semibold text-gray-700">Data</th><th className="p-3 font-semibold text-gray-700">Cliente</th><th className="p-3 font-semibold text-gray-700 text-right">Bruto</th><th className="p-3 font-semibold text-[#FF0000] text-right">Prejuízos</th><th className="p-3 font-semibold text-[#00AA00] text-right">Valor Real</th></tr></thead>
                  <tbody className="divide-y">
                    {getBookingsByMonth(finSelectedMonth, finSelectedYear).length > 0 ? ( getBookingsByMonth(finSelectedMonth, finSelectedYear).map(booking => { const damage = parseFloat(booking.damageValue) || 0; const realValue = (parseFloat(booking.totalValue) || 0) - damage; return ( <tr key={booking.id} className="hover:bg-gray-50"><td className="p-3 text-gray-800">{new Date(booking.checkIn).toLocaleDateString('pt-BR')}</td><td className="p-3"><div className="font-medium text-gray-900">{booking.dogName}</div><div className="text-gray-600 text-xs">{booking.ownerName}</div>{damage > 0 && <div className="text-xs text-[#FF0000] italic mt-1">Obs: {booking.damageDescription}</div>}</td><td className="p-3 text-right text-gray-700">R$ {booking.totalValue}</td><td className="p-3 text-right text-[#FF0000] font-medium">{damage > 0 ? `- R$ ${damage}` : '-'}</td><td className="p-3 text-right font-bold text-[#00AA00]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(realValue)}</td></tr> )}) ) : ( <tr><td colSpan="5" className="p-8 text-center text-gray-500 italic">Nenhum faturamento registrado neste período.</td></tr> )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 bg-[#0000FF]/5 p-4 rounded-xl border border-[#0000FF]/10 w-fit"><label className="font-bold text-[#0000FF]">Selecione o Ano:</label><select value={finSelectedYear} onChange={(e) => setFinSelectedYear(parseInt(e.target.value))} className="p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0000FF]">{[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left"><thead className="bg-gray-100 border-b"><tr><th className="p-4 font-bold text-gray-800">Mês</th><th className="p-4 font-bold text-gray-800 text-center">Hospedagens</th><th className="p-4 font-bold text-gray-800 text-right">Lucro Líquido (Real)</th></tr></thead>
                <tbody className="divide-y">{monthNames.map((month, idx) => { const netTotal = calculateMonthlyNetTotal(idx, finSelectedYear); const count = getBookingsByMonth(idx, finSelectedYear).length; return ( <tr key={month} className="hover:bg-gray-50"><td className="p-4 font-medium text-gray-800">{month}</td><td className="p-4 text-center text-gray-600">{count > 0 ? <span className="bg-[#0000FF]/10 text-[#0000FF] px-2 py-1 rounded-full text-xs font-bold">{count}</span> : '-'}</td><td className={`p-4 text-right font-bold ${netTotal > 0 ? 'text-[#00AA00]' : 'text-gray-500'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netTotal)}</td></tr> ); })}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  
    const renderAgenda = () => (
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 min-h-[500px]">
        <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg w-full lg:w-auto justify-center lg:justify-start">{['day', 'week', 'month'].map(v => (<button key={v} onClick={() => setView(v)} className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-sm font-medium transition ${view === v ? 'bg-white shadow text-[#0000FF]' : 'text-gray-600'}`}>{v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}</button>))}</div>
          <div className="flex items-center justify-between w-full lg:w-auto gap-2 bg-gray-50 lg:bg-transparent p-2 rounded-lg lg:p-0"><button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-200 rounded-full bg-white lg:bg-transparent shadow-sm lg:shadow-none"><ChevronLeft size={24} className="text-gray-700"/></button><h2 className="text-lg font-semibold w-full text-center lg:w-64 truncate text-gray-800">{view === 'day' && formatDateBR(currentDate)}{view === 'month' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}{view === 'week' && `Semana de ${formatDateBR(startOfWeek(currentDate))}`}</h2><button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-200 rounded-full bg-white lg:bg-transparent shadow-sm lg:shadow-none"><ChevronRight size={24} className="text-gray-700"/></button></div>
          <button onClick={() => handleOpenBookingModal()} className="w-full lg:w-auto bg-[#0000FF] text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow hover:bg-[#0000AA] transition-transform active:scale-95"><Plus size={20} /> <span>Nova Reserva</span></button>
        </div>
        {view === 'day' && renderDayView()}{view === 'week' && renderWeekView()}{view === 'month' && renderMonthView()}
      </div>
    );
  
    const renderClientList = () => {
      const filteredClients = getFilteredClients();
      return (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 min-h-[500px]">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-[#0000FF]"/> Cadastros</h2>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 w-full"><input type="text" value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} placeholder="Buscar por cão ou tutor..." className="pl-10 pr-4 py-3 border rounded-lg w-full lg:w-64 focus:outline-none focus:ring-2 focus:ring-[#0000FF]" /><Search className="absolute left-3 top-3.5 text-[#0000FF]" size={18} /></div>
                    <button onClick={() => handleOpenClientModal(null)} className="bg-[#00AA00] text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow hover:bg-[#00FF00] whitespace-nowrap w-full sm:w-auto"><Plus size={20} /> Novo Cadastro</button>
                </div>
            </div>
            {filteredClients.length === 0 ? ( <div className="text-center py-20 text-gray-500 border-2 border-dashed rounded-xl bg-gray-50">{clientSearchTerm ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}</div> ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.map(client => (
                      <div key={client.id} className="border rounded-xl p-4 hover:shadow-md transition bg-gray-50 flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                              <div className="w-14 h-14 bg-white rounded-full overflow-hidden border">{client.photos && client.photos[0] ? <img src={client.photos[0]} alt="Dog" className="w-full h-full object-cover" /> : <Dog className="p-3 text-gray-400 w-full h-full"/>}</div>
                              <div><h3 className="font-bold text-lg truncate w-40">{client.dogName}</h3><p className="text-sm text-gray-600 truncate w-40">{client.ownerName}</p></div>
                          </div>
                          <div className="text-sm space-y-1 mt-1">
                              <div className="flex items-center gap-2 text-gray-600"><FaceRating rating={client.pastBookings?.[0]?.dogBehaviorRating || 3} readonly size={16} /> <span className="text-xs">(Último Comp.)</span></div>
                              <div className="flex items-center gap-2 text-gray-600"><History size={14} className="text-[#0000FF]"/> {client.pastBookings?.length || 0} Hospedagens</div>
                          </div>
                          <div className="flex gap-2 mt-auto pt-3"><button onClick={() => handleOpenClientModal(client)} className="flex-1 bg-white border border-[#0000FF]/30 text-[#0000FF] py-2 rounded-lg font-medium hover:bg-[#0000FF]/5 flex items-center justify-center gap-2"><FileText size={16}/> Detalhes</button><button onClick={() => handleDeleteClient(client.id)} className="p-2 text-[#FF0000] hover:bg-[#FF0000]/10 rounded-lg"><Trash2 size={20}/></button></div>
                      </div>
                  ))}
              </div>
            )}
        </div>
      );
    };
  
    const renderDayView = () => {
      const daysBookings = getBookingsForDate(currentDate);
      return (
        <div className="space-y-4">
          {daysBookings.length === 0 ? ( <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">Nenhum cãozinho hospedado hoje.</div> ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {daysBookings.map(booking => (<BookingCard key={booking.id} booking={booking} onEdit={() => handleOpenBookingModal(booking)} onDelete={() => handleDeleteBooking(booking.id)} />))}
            </div>
          )}
        </div>
      );
    };
  
    const renderWeekView = () => { const start = startOfWeek(currentDate); const weekDays = Array.from({length: 7}, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; }); return ( 
      <div className="w-full overflow-x-auto pb-4">
        <div className="grid grid-cols-7 gap-2 min-w-[800px]">
           {weekDays.map((day, idx) => { 
             const dayBookings = getBookingsForDate(day); 
             const isToday = isSameDate(day, new Date()); 
             return ( 
               <div key={idx} className={`border rounded-lg flex flex-col h-[500px] ${isToday ? 'bg-[#0000FF]/5 border-[#0000FF]/20' : 'bg-white'}`}>
                 <div className={`p-2 text-center border-b font-medium ${isToday ? 'text-[#0000FF]' : 'text-gray-600'}`}>
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' })} <br/>
                    <span className="text-sm text-gray-500">{day.getDate()}/{day.getMonth()+1}</span>
                 </div>
                 <div className="flex-1 p-1 overflow-y-auto space-y-2 scrollbar-thin">
                    {dayBookings.map(b => ( 
                      <div key={b.id} onClick={() => handleOpenBookingModal(b)} className="p-2 bg-white border border-l-4 border-l-[#0000FF] rounded shadow-sm text-xs cursor-pointer hover:bg-[#0000FF]/5 transition">
                        <div className="font-bold truncate">{b.dogName}</div>
                        <div className="text-gray-600 truncate">{b.ownerName}</div>
                      </div>
                    ))}
                 </div>
               </div> 
             ); 
           })}
        </div>
      </div> 
    ); };
  
    const renderMonthView = () => { const year = currentDate.getFullYear(); const month = currentDate.getMonth(); const daysInMonth = getDaysInMonth(currentDate); const firstDayOfMonth = new Date(year, month, 1).getDay(); const days = [...Array(firstDayOfMonth).fill(null), ...Array(daysInMonth).keys().map(i => new Date(year, month, i + 1))]; return ( 
      <div className="w-full overflow-x-auto pb-4">
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden min-w-[800px]">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => ( <div key={d} className="bg-gray-100 p-2 text-center font-semibold text-sm text-gray-600">{d}</div>))}
            {days.map((day, idx) => { 
                if (!day) return <div key={`empty-${idx}`} className="bg-white h-32"></div>; 
                const dayBookings = getBookingsForDate(day); 
                const isToday = isSameDate(day, new Date()); 
                return ( 
                    <div key={idx} className={`bg-white h-32 p-1 flex flex-col hover:bg-gray-50 transition ${isToday ? 'bg-[#0000FF]/5' : ''}`}>
                        <span className={`text-sm font-medium mb-1 self-end px-1.5 rounded ${isToday ? 'bg-[#0000FF] text-white' : 'text-gray-700'}`}>{day.getDate()}</span>
                        <div className="flex-1 overflow-y-auto space-y-1">
                            {dayBookings.slice(0, 3).map(b => (<div key={b.id} onClick={() => handleOpenBookingModal(b)} className="text-xs truncate bg-[#0000FF]/10 text-[#0000FF] px-1 rounded cursor-pointer">{b.dogName}</div>))}
                            {dayBookings.length > 3 && <div className="text-xs text-gray-400 text-center">+{dayBookings.length - 3} mais</div>}
                        </div>
                    </div> 
                ); 
            })}
        </div>
      </div>
    ); };
  
    return (
      <div className="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden">
        <aside className="hidden md:flex w-64 bg-[#000099] text-white flex-col shadow-xl z-20"> {/* Azul escuro */}
          <div className="p-6 flex items-center gap-3 border-b border-[#0000CC]"><div className="bg-white p-1.5 rounded-full text-[#000099]"><Dog size={24} /></div><h1 className="font-bold text-lg tracking-wide">DogManager</h1></div>
          <nav className="flex-1 py-6 space-y-2 px-3">
              <button onClick={() => setActiveTab('agenda')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'agenda' ? 'bg-[#0000CC] text-white shadow' : 'text-[#AAAACC] hover:bg-[#0000CC] hover:text-white'}`}><Calendar size={20} /> Agenda</button>
              <button onClick={() => setActiveTab('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'clients' ? 'bg-[#0000CC] text-white shadow' : 'text-[#AAAACC] hover:bg-[#0000CC] hover:text-white'}`}><Users size={20} /> Cadastros</button>
              <button onClick={() => setActiveTab('financial')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'financial' ? 'bg-[#0000CC] text-white shadow' : 'text-[#AAAACC] hover:bg-[#0000CC] hover:text-white'}`}><PieChart size={20} /> Financeiro</button>
          </nav>
          <div className="p-4 border-t border-[#0000CC]"><button onClick={handleLogout} className="w-full flex items-center gap-2 text-[#AAAACC] hover:text-white transition text-sm"><LogOut size={16}/> Sair do sistema</button></div>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-sm h-16 flex items-center px-4 md:px-6 justify-between z-10">
               <div className="flex items-center gap-2 md:hidden"><Dog size={24} className="text-[#0000FF]"/><h2 className="font-bold text-[#000099]">DogManager</h2></div>
               <h2 className="hidden md:block text-xl font-semibold text-gray-700 capitalize">{activeTab === 'agenda' && 'Agenda de Hospedagem'} {activeTab === 'clients' && 'Gerenciamento de Clientes'} {activeTab === 'financial' && 'Relatórios Financeiros'}</h2>
               <div className="flex items-center gap-3">
                  <div className="flex md:hidden gap-2 mr-2"><button onClick={() => setActiveTab('agenda')} className={`p-2 rounded ${activeTab === 'agenda' ? 'bg-[#0000FF]/10 text-[#0000FF]' : 'text-gray-500'}`}><Calendar size={20}/></button><button onClick={() => setActiveTab('clients')} className={`p-2 rounded ${activeTab === 'clients' ? 'bg-[#0000FF]/10 text-[#0000FF]' : 'text-gray-500'}`}><Users size={20}/></button><button onClick={() => setActiveTab('financial')} className={`p-2 rounded ${activeTab === 'financial' ? 'bg-[#0000FF]/10 text-[#0000FF]' : 'text-gray-500'}`}><PieChart size={20}/></button></div>
                  <span className="text-sm text-gray-500 hidden sm:block">Olá, seja bem vindo</span><div className="w-8 h-8 bg-[#0000FF]/10 rounded-full flex items-center justify-center text-[#0000FF] font-bold cursor-pointer" onClick={handleLogout}>R</div>
               </div>
          </header>
          <main className="flex-1 overflow-y-auto p-2 md:p-6">{activeTab === 'agenda' && renderAgenda()}{activeTab === 'clients' && renderClientList()}{activeTab === 'financial' && renderFinancial()}</main>
        </div>
        {isModalOpen && ( <BookingModal data={editingData} mode={modalMode} clientDatabase={clientDatabase} onSave={handleSave} onClose={() => setIsModalOpen(false)} races={races} onAddRace={handleAddRace} /> )}
      </div>
    );
  }