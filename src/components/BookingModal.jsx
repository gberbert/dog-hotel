import React, { useState, useEffect } from 'react';
import { 
  FileText, Star, Camera, Plus, X, DollarSign, CheckCircle, 
  AlertTriangle, Heart, History, Search, AlertCircle, Upload, 
  MessageCircle, FilePlus, Pill, User, Dog, Calendar as CalendarIcon,
  Trash2, Lock
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateDoc, doc } from 'firebase/firestore';
import { db, storage, appId } from '../utils/firebase';
import { compressImage } from '../utils/fileHelpers';
import { calculateTotalDays, formatCurrency } from '../utils/calculations';
import { StarRating, FaceRating } from './shared/RatingComponents';
import ImageLightbox from './shared/ImageLightbox';

// Componente auxiliar para exibir campos "Somente Leitura"
const ReadOnlyField = ({ label, value, icon: Icon, highlight = false }) => (
    <div className={`mb-3 ${highlight ? 'bg-gray-50 p-2 rounded border border-gray-100' : ''}`}>
        <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-1">
            {Icon && <Icon size={12} />} {label}
        </span>
        <div className="text-sm font-medium text-gray-800 break-words">
            {value || <span className="text-gray-300 italic">-</span>}
        </div>
    </div>
);

export default function BookingModal({ data, mode, clientDatabase, onSave, onClose, races, onAddRace }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [newRace, setNewRace] = useState('');
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', time: '' });
  const [socialDogInput, setSocialDogInput] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [vaccineLightboxIndex, setVaccineLightboxIndex] = useState(-1);

  const isBookingMode = mode === 'booking';
  const isEditingBooking = isBookingMode && data && data.id;
  
  // Se for reserva, mostramos campos cadastrais como ReadOnly. Se for Cliente (novo/edit), mostramos Inputs.
  const showReadOnly = isBookingMode;

  const [formData, setFormData] = useState({
    clientId: data?.clientId || (mode.startsWith('client') && data?.id ? data.id : '') || '',
    dogName: data?.dogName || '', 
    dogSize: data?.dogSize || 'Pequeno', 
    dogBreed: data?.dogBreed || 'Sem Raça Definida (SRD)',
    source: data?.source || 'Particular',
    
    ownerName: data?.ownerName || '', 
    whatsapp: data?.whatsapp || '',
    ownerName2: data?.ownerName2 || '',
    whatsapp2: data?.whatsapp2 || '',

    ownerEmail: data?.ownerEmail || '',
    ownerDoc: data?.ownerDoc || '',
    address: data?.address || '',
    birthYear: data?.birthYear || '', 
    
    history: data?.history || '',
    ownerHistory: data?.ownerHistory || '', 
    ownerRating: data?.ownerRating || 3, 
    restrictions: data?.restrictions || '', 
    socialization: data?.socialization || [], 
    
    medications: data?.medications || [],

    checkIn: data?.checkIn || '', 
    checkOut: data?.checkOut || '',
    rating: data?.rating || 5, 
    dailyRate: data?.dailyRate || 80, 
    dogBehaviorRating: data?.dogBehaviorRating || 3, 
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

  const generateYearOptions = () => {
    const years = [];
    for (let year = 2030; year >= 2000; year--) years.push(year);
    return years;
  };

  const calculateAge = (birthYear) => {
    if (!birthYear) return 0;
    return Math.max(0, new Date().getFullYear() - parseInt(birthYear));
  };
  const realAgeYears = calculateAge(formData.birthYear);

  const calculateHumanAge = (ageInYears, size) => {
    const age = ageInYears;
    const humanAgeMap = {
        'Pequeno': [22, 27, 29, 36, 46, 55, 68, 76, 87, 99],
        'Médio':   [12, 23, 39, 51, 63, 75, 95, 95, 95, 95], 
        'Grande':  [8, 16, 22, 40, 55, 75, 94, 94, 94, 94], 
        'Gigante': [12, 22, 40, 55, 75, 94, 94, 94, 94, 94]
    };
    const sizeKey = size || 'Pequeno';
    const ages = humanAgeMap[sizeKey] || humanAgeMap['Pequeno'];
    if (age <= 0) return 0;
    if (age < 1) return Math.round(age * ages[0]);
    return ages[Math.min(age, ages.length) - 1] || ages[ages.length - 1];
  };
  const humanAge = calculateHumanAge(realAgeYears, formData.dogSize);

  useEffect(() => {
    if (isBookingMode && formData.checkIn && formData.checkOut && formData.dailyRate) {
      const days = calculateTotalDays(formData.checkIn, formData.checkOut);
      const dailyRateFloat = parseFloat(formData.dailyRate) || 0;
      setFormData(prev => ({ ...prev, totalValue: days * dailyRateFloat }));
    }
  }, [formData.checkIn, formData.checkOut, formData.dailyRate, isBookingMode]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleMedicationChange = (e) => setNewMedication(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleAddMedication = () => {
    if (newMedication.name && newMedication.dosage && newMedication.time) {
      setFormData(prev => ({ ...prev, medications: [...prev.medications, newMedication] }));
      setNewMedication({ name: '', dosage: '', time: '' });
    } else alert("Preencha todos os campos da medicação.");
  };
  const handleRemoveMedication = (index) => setFormData(prev => ({ ...prev, medications: prev.medications.filter((_, i) => i !== index) }));

  const handleAddRace = async (e) => {
    e.preventDefault();
    if (newRace && !races.map(r => r.name.toLowerCase()).includes(newRace.toLowerCase())) {
        try { await onAddRace(newRace); setFormData(prev => ({ ...prev, dogBreed: newRace })); setNewRace(''); } catch (error) { alert("Erro ao adicionar raça."); }
    }
  };

  const handleAddSocialDog = (e) => {
      e.preventDefault();
      if (socialDogInput && formData.socialization.length < 5 && !formData.socialization.includes(socialDogInput)) {
          setFormData(prev => ({ ...prev, socialization: [...prev.socialization, socialDogInput] }));
          setSocialDogInput('');
      }
  };

  const handleFileSelect = async (e, type) => {
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    const isImage = file.type.startsWith('image/');
    if (!isImage && file.size > 3 * 1024 * 1024) return alert("PDFs devem ter no máximo 3MB.");
    if (type === 'photos' && formData.photos.length >= 5) return;
    if (type === 'vaccines' && formData.vaccineDocs.length >= 3) return;

    setIsUploading(true);
    try {
        let uploadFile = file;
        if (isImage) uploadFile = await compressImage(file);
        const uniqueName = `${type}-${Date.now()}-${file.name}`;
        const storageRef = ref(storage, `images/public/${uniqueName}`);
        await uploadBytes(storageRef, uploadFile);
        const url = await getDownloadURL(storageRef);
        const field = type === 'photos' ? 'photos' : 'vaccineDocs';
        setFormData(prev => ({ ...prev, [field]: [...prev[field], url] }));
    } catch (error) {
        alert(`Erro upload: ${error.message}`);
    } finally {
        setIsUploading(false);
    }
  };
  
  const removePhoto = (index, type) => {
      const field = type === 'photos' ? 'photos' : 'vaccineDocs';
      setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleDeleteHistoryItem = async (historyId) => {
    if (!window.confirm("Excluir registro do histórico?")) return;
    if (!formData.clientId) return alert("Cliente não salvo.");
    try {
        const newPastBookings = formData.pastBookings.filter(h => h.id !== historyId);
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', formData.clientId), { pastBookings: newPastBookings });
        setFormData(prev => ({ ...prev, pastBookings: newPastBookings }));
    } catch (e) { console.error(e); }
  };

  const selectClient = (client) => {
    setFormData(prev => ({ ...prev, 
      clientId: client.id, dogName: client.dogName, dogSize: client.dogSize || 'Pequeno', 
      dogBreed: client.dogBreed || 'SRD', source: client.source || 'Particular', 
      ownerName: client.ownerName, ownerName2: client.ownerName2 || '', 
      whatsapp: client.whatsapp, whatsapp2: client.whatsapp2 || '', 
      ownerEmail: client.ownerEmail || '', ownerDoc: client.ownerDoc, 
      address: client.address, birthYear: client.birthYear || '', history: client.history, 
      ownerHistory: client.ownerHistory, ownerRating: client.ownerRating, restrictions: client.restrictions, 
      socialization: client.socialization || [], medications: client.medications || [], 
      photos: client.photos || [], vaccineDocs: client.vaccineDocs || [], vaccines: client.vaccines, 
      lastAntiRabica: client.lastAntiRabica || '', lastMultipla: client.lastMultipla || '',
      pastBookings: client.pastBookings || [] 
    }));
    setSearchQuery(''); setShowSearchResults(false);
  };

  const getWhatsAppLink = (number) => {
    if (!number) return null;
    const n = number.replace(/\D/g, '');
    return (n.length >= 10) ? `https://wa.me/55${n}` : null;
  };

  const totalPaidValue = (formData.pastBookings || []).reduce((acc, curr) => acc + ((parseFloat(curr.totalValue)||0) - (parseFloat(curr.damageValue)||0)), 0);
  const availableDogs = clientDatabase.map(c => c.dogName).filter(n => n !== formData.dogName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 md:p-4 overflow-y-auto">
      {lightboxIndex >= 0 && <ImageLightbox images={formData.photos} currentIndex={lightboxIndex} setIndex={setLightboxIndex} onClose={() => setLightboxIndex(-1)} />}
      {vaccineLightboxIndex >= 0 && <ImageLightbox images={formData.vaccineDocs} currentIndex={vaccineLightboxIndex} setIndex={setVaccineLightboxIndex} onClose={() => setVaccineLightboxIndex(-1)} />}

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col">
        <div className="bg-[#0000FF] px-6 py-4 flex justify-between items-center sticky top-0 z-10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText /> {mode === 'client_new' ? 'Novo Cadastro' : (isBookingMode ? 'Nova Hospedagem' : 'Editar Cliente')}
            </h2>
            <button onClick={onClose} className="text-white hover:bg-[#0000AA] rounded-full p-1"><X size={24} /></button>
        </div>

        {/* BUSCA DE CLIENTE (Apenas na Nova Reserva se não tiver dados) */}
        {isBookingMode && !data && (
            <div className="bg-indigo-50 px-6 py-3 border-b border-indigo-100 relative">
                <label className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                   <Search size={16}/> Buscar Cliente Cadastrado
                </label>
                <div className="mt-1 relative">
                     <input value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setShowSearchResults(true);}} placeholder="Digite o nome do cão..." className="w-full p-2 pl-3 border rounded shadow-sm outline-none focus:ring-2 focus:ring-[#0000FF]" />
                </div>
                {showSearchResults && searchQuery && (
                    <div className="absolute left-0 right-0 bg-white shadow-xl z-20 max-h-60 overflow-y-auto border mt-1 mx-6 rounded-lg">
                        {clientDatabase.filter(c => c.dogName.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                            <div key={c.id} onClick={() => selectClient(c)} className="p-3 hover:bg-indigo-50 cursor-pointer border-b font-medium flex justify-between">
                                <span>{c.dogName}</span>
                                <span className="text-sm text-gray-500">{c.ownerName}</span>
                            </div>
                        ))}
                        {clientDatabase.filter(c => c.dogName.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                            <div className="p-3 text-gray-500 text-sm">Nenhum cliente encontrado.</div>
                        )}
                    </div>
                )}
            </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* ================= COLUNA 1: PET (CADASTRO + VARIÁVEIS) ================= */}
            <div className="space-y-5">
                <h3 className="text-[#0000FF] font-bold border-b pb-2 flex items-center gap-2"><Dog size={18}/> Dados do Pet</h3>
                
                {/* SEÇÃO CADASTRO (READ ONLY NA RESERVA) */}
                {showReadOnly ? (
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 relative">
                        <div className="absolute top-2 right-2 text-gray-300"><Lock size={14}/></div>
                        <ReadOnlyField label="Nome" value={formData.dogName} />
                        <ReadOnlyField label="Raça" value={formData.dogBreed} />
                        <ReadOnlyField label="Porte" value={formData.dogSize} />
                        <ReadOnlyField label="Idade" value={`${realAgeYears} anos (${humanAge} humana)`} />
                        
                        <div className="col-span-2">
                             <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Restrições / Alergias</span>
                             <div className="text-sm font-bold text-red-600 bg-white p-2 rounded border border-red-100">
                                {formData.restrictions || "Nenhuma restrição registrada."}
                             </div>
                        </div>

                         <div className="col-span-2">
                             <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Medicações (Cadastro)</span>
                             {formData.medications.length === 0 ? <span className="text-sm text-gray-400 italic">-</span> : (
                                 <ul className="text-sm space-y-1">
                                     {formData.medications.map((m, i) => (
                                         <li key={i} className="bg-white p-1 rounded border border-gray-200 flex gap-2">
                                             <Pill size={14} className="text-red-400 mt-0.5"/> 
                                             <span><b>{m.name}</b> ({m.dosage}) às {m.time}</span>
                                         </li>
                                     ))}
                                 </ul>
                             )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* MODO EDIÇÃO/NOVO: CAMPOS INPUT */}
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium">Nome</label><input name="dogName" value={formData.dogName} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
                            <div>
                                <label className="text-sm font-medium">Porte</label>
                                <select name="dogSize" value={formData.dogSize} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                                    <option>Pequeno</option><option>Médio</option><option>Grande</option><option>Gigante</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="text-sm font-medium">Nasc.</label><select name="birthYear" value={formData.birthYear} onChange={handleChange} className="w-full p-2 border rounded bg-white"><option value="">Ano</option>{generateYearOptions().map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                            <div><label className="text-sm text-gray-500">Real</label><input readOnly value={`${realAgeYears} anos`} className="w-full p-2 border bg-gray-100 text-xs font-bold rounded"/></div>
                            <div><label className="text-sm text-[#FF7F00]">Humana</label><input readOnly value={`${humanAge} anos`} className="w-full p-2 border border-[#FF7F00]/30 bg-[#FF7F00]/10 text-[#FF7F00] text-xs font-bold rounded"/></div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Raça</label>
                            <div className="flex gap-2">
                                <select name="dogBreed" value={formData.dogBreed} onChange={handleChange} className="flex-1 p-2 border rounded bg-white">
                                    {races.sort((a, b) => a.name.localeCompare(b.name)).map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                </select>
                                <div className="flex gap-1"><input value={newRace} onChange={(e) => setNewRace(e.target.value)} placeholder="Nova" className="w-20 p-2 border rounded text-sm"/><button type="button" onClick={handleAddRace} disabled={!newRace} className="bg-green-600 text-white px-2 rounded font-bold">+</button></div>
                            </div>
                        </div>
                        <div className="bg-red-50 p-3 rounded border border-red-200">
                            <h4 className="text-red-600 font-bold text-sm mb-2 flex gap-2"><Pill size={16}/> Medicações</h4>
                            <div className="grid grid-cols-6 gap-2 mb-2">
                                <input name="name" value={newMedication.name} onChange={handleMedicationChange} placeholder="Nome" className="col-span-2 p-1 border rounded text-xs"/>
                                <input name="dosage" value={newMedication.dosage} onChange={handleMedicationChange} placeholder="Dose" className="col-span-2 p-1 border rounded text-xs"/>
                                <input name="time" value={newMedication.time} onChange={handleMedicationChange} placeholder="Hr" className="col-span-1 p-1 border rounded text-xs"/>
                                <button type="button" onClick={handleAddMedication} className="col-span-1 bg-red-500 text-white rounded flex items-center justify-center"><Plus size={14}/></button>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {formData.medications.map((m, i) => (
                                    <div key={i} className="flex justify-between bg-white p-1 rounded border text-xs">
                                        <span><b>{m.name}</b> ({m.dosage}) - {m.time}</span>
                                        <button type="button" onClick={() => handleRemoveMedication(i)} className="text-red-500"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div><label className="text-sm font-medium">Restrições</label><input name="restrictions" value={formData.restrictions} onChange={handleChange} className="w-full p-2 border border-red-200 bg-red-50 text-red-800 rounded" placeholder="Ex: Alergias..."/></div>
                    </>
                )}

                {/* SEÇÃO VARIÁVEIS DA HOSPEDAGEM (SEMPRE EDITÁVEL) */}
                <div className="border-t pt-4 mt-4">
                    <h4 className="text-gray-500 text-xs font-bold uppercase mb-3">Variáveis desta Hospedagem</h4>
                    
                    <div className="mb-3">
                        <label className="text-sm font-medium block mb-1">Comportamento / Histórico</label>
                        <textarea name="history" value={formData.history} onChange={handleChange} rows={3} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500" placeholder="Descreva o comportamento nesta estadia..."/>
                    </div>
                    
                    <div className="bg-indigo-50 p-3 rounded border border-indigo-100 mb-3">
                        <label className="text-sm font-bold text-[#0000FF] block mb-1">Avaliação Geral do Cão</label>
                        <FaceRating rating={formData.dogBehaviorRating} setRating={(r) => setFormData({...formData, dogBehaviorRating: r})} />
                    </div>

                    <div>
                        <label className="text-sm font-medium flex items-center gap-1"><Heart size={14} className="text-pink-500"/> Socialização (Amigos)</label>
                        <div className="flex gap-2 my-1">
                            <select value={socialDogInput} onChange={(e) => setSocialDogInput(e.target.value)} className="flex-1 p-2 border rounded text-sm"><option value="">+ Selecionar Amigo</option>{clientDatabase.map(c => c.dogName).filter(n => n !== formData.dogName).map(d => <option key={d} value={d}>{d}</option>)}</select>
                            <button type="button" onClick={handleAddSocialDog} className="bg-pink-100 text-pink-600 px-3 rounded font-bold hover:bg-pink-200">+</button>
                        </div>
                        <div className="flex flex-wrap gap-1">{formData.socialization.map((d, i) => <span key={i} className="bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full text-xs border border-pink-100">{d} <button type="button" onClick={() => setFormData(prev => ({...prev, socialization: prev.socialization.filter(x => x !== d)}))} className="ml-1 hover:text-red-500">×</button></span>)}</div>
                    </div>
                </div>
            </div>

            {/* ================= COLUNA 2: TUTOR + FINANCEIRO ================= */}
            <div className="space-y-5">
                <h3 className="text-[#0000FF] font-bold border-b pb-2 flex items-center gap-2"><User size={18}/> Dados do Tutor</h3>
                
                {showReadOnly ? (
                     <div className="grid grid-cols-1 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200 relative">
                        <div className="absolute top-2 right-2 text-gray-300"><Lock size={14}/></div>
                        <ReadOnlyField label="Tutor 1" value={`${formData.ownerName} ${formData.whatsapp ? `(${formData.whatsapp})` : ''}`} />
                        {formData.ownerName2 && <ReadOnlyField label="Tutor 2" value={`${formData.ownerName2} ${formData.whatsapp2 ? `(${formData.whatsapp2})` : ''}`} />}
                     </div>
                ) : (
                    <>
                        <div className="bg-gray-50 p-3 rounded border space-y-2">
                            <h4 className="font-bold text-gray-700 text-sm">Tutor 1 (Principal)</h4>
                            <input name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="Nome" className="w-full p-2 border rounded bg-white" required />
                            <input name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="WhatsApp" className="w-full p-2 border rounded bg-white" />
                        </div>
                        <div className="bg-gray-50 p-3 rounded border space-y-2">
                            <h4 className="font-bold text-gray-700 text-sm">Tutor 2 (Opcional)</h4>
                            <input name="ownerName2" value={formData.ownerName2} onChange={handleChange} placeholder="Nome" className="w-full p-2 border rounded bg-white" />
                            <input name="whatsapp2" value={formData.whatsapp2} onChange={handleChange} placeholder="WhatsApp" className="w-full p-2 border rounded bg-white" />
                        </div>
                    </>
                )}

                {/* CAMPOS EDITÁVEIS DO TUTOR */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="text-sm font-medium">Captação</label>
                        <select name="source" value={formData.source} onChange={handleChange} className="w-full p-2 border rounded bg-white focus:ring-2 focus:ring-blue-500">
                            <option>Particular</option><option>DogHero</option><option>Indicação</option><option>Instagram</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium block mb-1">Avaliação do Tutor</label>
                        <FaceRating rating={formData.ownerRating} setRating={(r) => setFormData({...formData, ownerRating: r})} size={20} />
                    </div>
                </div>
                <textarea name="ownerHistory" value={formData.ownerHistory} onChange={handleChange} placeholder="Obs sobre o tutor (Editável)..." className="w-full p-2 border rounded h-16 text-sm focus:ring-2 focus:ring-blue-500"/>

                {/* FINANCEIRO DA RESERVA (SEMPRE EDITÁVEL SE FOR BOOKING) */}
                {isBookingMode && (
                    <div className="bg-green-50 p-4 rounded border border-green-200 mt-4 shadow-sm">
                        <h3 className="text-green-700 font-bold mb-3 flex items-center gap-2"><DollarSign size={18}/> Dados da Hospedagem</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs text-gray-600 font-bold">Entrada</label><input type="datetime-local" name="checkIn" value={formData.checkIn} onChange={handleChange} className="w-full p-2 border border-green-200 rounded text-sm focus:ring-2 focus:ring-green-500" required/></div>
                            <div><label className="text-xs text-gray-600 font-bold">Saída</label><input type="datetime-local" name="checkOut" value={formData.checkOut} onChange={handleChange} className="w-full p-2 border border-green-200 rounded text-sm focus:ring-2 focus:ring-green-500" required/></div>
                            <div><label className="text-xs text-gray-600 font-bold">Diária (R$)</label><input type="number" name="dailyRate" value={formData.dailyRate} onChange={handleChange} className="w-full p-2 border border-green-200 rounded text-sm font-bold text-green-700"/></div>
                            <div><label className="text-xs text-gray-600 font-bold">Total Estimado</label><div className="w-full p-2 bg-white border border-green-300 rounded text-sm font-bold text-green-800 shadow-inner">{formatCurrency(formData.totalValue)}</div></div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-green-200">
                            <label className="text-xs font-bold text-red-600 flex gap-1 mb-1"><AlertTriangle size={12}/> Prejuízos / Danos</label>
                            <div className="flex gap-2">
                                <input type="number" name="damageValue" value={formData.damageValue} onChange={handleChange} className="w-24 p-2 border border-red-200 bg-white rounded text-sm text-red-700" placeholder="R$"/>
                                <input type="text" name="damageDescription" value={formData.damageDescription} onChange={handleChange} className="flex-1 p-2 border border-red-200 bg-white rounded text-sm" placeholder="Motivo"/>
                            </div>
                        </div>
                    </div>
                )}

                {/* GALERIA E VACINAS (VISUALIZAÇÃO NA RESERVA, EDIÇÃO NO CADASTRO) */}
                <div className="border-t pt-4">
                   <h4 className="text-[#0000FF] font-bold text-sm mb-2 flex gap-2"><Camera size={16}/> Galeria ({formData.photos.length})</h4>
                   <div className="flex gap-2 overflow-x-auto pb-2">
                       {!showReadOnly && (
                           <label className={`w-16 h-16 border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-gray-50 rounded flex-shrink-0 ${isUploading ? 'opacity-50' : ''}`}>
                               {isUploading ? <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div> : <Upload size={20} className="text-gray-400"/>}
                               <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'photos')} disabled={formData.photos.length >= 5 || isUploading} />
                           </label>
                       )}
                       {formData.photos.length === 0 && showReadOnly && <span className="text-xs text-gray-400 italic">Sem fotos cadastradas.</span>}
                       {formData.photos.map((url, i) => (
                           <div key={i} className="relative w-16 h-16 flex-shrink-0 group">
                               <img src={url} className="w-full h-full object-cover rounded shadow cursor-zoom-in" onClick={() => setLightboxIndex(i)} />
                               {!showReadOnly && <button type="button" onClick={() => removePhoto(i, 'photos')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X size={10}/></button>}
                           </div>
                       ))}
                   </div>
                </div>

                <div>
                    <h4 className="text-[#0000FF] font-bold text-sm mb-2 flex gap-2"><FilePlus size={16}/> Vacinas ({formData.vaccineDocs.length})</h4>
                    
                    {/* Datas das Vacinas */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {showReadOnly ? (
                            <>
                                <ReadOnlyField label="Anti-Rábica" value={formData.lastAntiRabica ? new Date(formData.lastAntiRabica).toLocaleDateString('pt-BR') : null} highlight/>
                                <ReadOnlyField label="Múltipla" value={formData.lastMultipla ? new Date(formData.lastMultipla).toLocaleDateString('pt-BR') : null} highlight/>
                            </>
                        ) : (
                            <>
                                <div><label className="text-xs text-gray-500">Anti-Rábica</label><input type="date" name="lastAntiRabica" value={formData.lastAntiRabica} onChange={handleChange} className="w-full p-1 border rounded text-xs"/></div>
                                <div><label className="text-xs text-gray-500">Múltipla (V8/V10)</label><input type="date" name="lastMultipla" value={formData.lastMultipla} onChange={handleChange} className="w-full p-1 border rounded text-xs"/></div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {!showReadOnly && (
                            <label className="w-16 h-16 border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-gray-50 rounded flex-shrink-0">
                                <Upload size={20} className="text-gray-400"/>
                                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileSelect(e, 'vaccines')} disabled={formData.vaccineDocs.length >= 3 || isUploading} />
                            </label>
                        )}
                        {formData.vaccineDocs.length === 0 && showReadOnly && <span className="text-xs text-gray-400 italic">Sem docs.</span>}
                        {formData.vaccineDocs.map((url, i) => (
                           <div key={i} className="relative w-16 h-16 flex-shrink-0 group">
                               {url.toLowerCase().includes('.pdf') ? 
                                 <a href={url} target="_blank" className="w-full h-full flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded"><FileText className="text-red-500"/><span className="text-[8px] font-bold text-red-500">PDF</span></a> : 
                                 <img src={url} className="w-full h-full object-cover rounded shadow cursor-zoom-in" onClick={() => setVaccineLightboxIndex(i)} />
                               }
                               {!showReadOnly && <button type="button" onClick={() => removePhoto(i, 'vaccines')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X size={10}/></button>}
                           </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* HISTÓRICO DE HOSPEDAGENS */}
            <div className="md:col-span-2 border-t pt-4">
                <div className="bg-gray-50 p-4 rounded border">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-gray-700 flex gap-2"><History size={18}/> Histórico Financeiro ({formData.pastBookings.length})</h3>
                        <p className="text-xs text-green-600 font-bold">Total Acumulado: {formatCurrency(totalPaidValue)}</p>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                        {formData.pastBookings.length === 0 ? <p className="text-gray-400 text-sm italic">Nenhum registro anterior.</p> : 
                         formData.pastBookings.map((h, i) => {
                            const total = parseFloat(h.totalValue)||0; 
                            const dmg = parseFloat(h.damageValue)||0;
                            return (
                                <div key={i} className="bg-white p-2 rounded border text-xs flex justify-between items-center">
                                    <div>
                                        <span className="font-bold block text-gray-800">{new Date(h.checkIn).toLocaleDateString()} - {new Date(h.checkOut).toLocaleDateString()}</span>
                                        {dmg > 0 && <span className="text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={10}/> Prejuízo: {h.damageDescription} (-{formatCurrency(dmg)})</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-blue-600 font-bold">{formatCurrency(total - dmg)}</div>
                                            <div className="flex gap-1 mt-0.5"><StarRating rating={h.rating} readonly size={10}/></div>
                                        </div>
                                        <button type="button" onClick={() => handleDeleteHistoryItem(h.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            );
                         })}
                    </div>
                </div>
            </div>

            {/* FOOTER DE AÇÃO */}
            <div className="md:col-span-2 flex justify-end gap-4 pt-4 border-t sticky bottom-0 bg-white p-4 -mx-6 -mb-6 border-t-gray-100 shadow-inner">
                <button type="button" onClick={onClose} className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-medium">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-8 py-2 bg-[#0000FF] text-white rounded-lg font-bold hover:bg-[#0000AA] shadow-lg flex items-center gap-2 disabled:opacity-70">
                    {isSaving ? 'Salvando...' : <><CheckCircle size={18}/> {isEditingBooking ? 'Salvar Alterações' : (isBookingMode ? 'Confirmar Reserva' : 'Salvar Cadastro')}</>}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}