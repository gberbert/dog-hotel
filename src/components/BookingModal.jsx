import React, { useState, useEffect } from 'react';
import {
    FileText, Star, Camera, Plus, X, DollarSign, CheckCircle,
    AlertTriangle, Heart, History, Search, AlertCircle, Upload,
    MessageCircle, FilePlus, Pill, User, Dog, Calendar as CalendarIcon,
    Trash2, Lock, ChevronDown
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
    <div className={`mb-3 ${highlight ? 'bg-secondary-50 p-2 rounded border border-secondary-100' : ''}`}>
        <span className="text-xs font-bold text-secondary-400 uppercase flex items-center gap-1 mb-1">
            {Icon && <Icon size={12} />} {label}
        </span>
        <div className="text-sm font-medium text-secondary-800 break-words">
            {value || <span className="text-secondary-300 italic">-</span>}
        </div>
    </div>
);

export default function BookingModal({ data, mode, clientDatabase, onSave, onClose, races, onAddRace, onDeleteRace, onCreateClient }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [newRace, setNewRace] = useState('');
    const [newMedication, setNewMedication] = useState({ name: '', dosage: '', time: '' });
    const [socialDogInput, setSocialDogInput] = useState('');
    const [isSocialDropdownOpen, setIsSocialDropdownOpen] = useState(false);
    const [socialSearchTerm, setSocialSearchTerm] = useState('');

    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [vaccineLightboxIndex, setVaccineLightboxIndex] = useState(-1);

    const [isRaceDropdownOpen, setIsRaceDropdownOpen] = useState(false);
    const [raceSearchTerm, setRaceSearchTerm] = useState('');
    const [raceToDelete, setRaceToDelete] = useState(null);

    const isBookingMode = mode === 'booking';
    const isEditingBooking = isBookingMode && data && data.id;

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

    useEffect(() => {
        setFormData({
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
    }, [data, mode]);

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
            'Médio': [12, 23, 39, 51, 63, 75, 95, 95, 95, 95],
            'Grande': [8, 16, 22, 40, 55, 75, 94, 94, 94, 94],
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
        setFormData(prev => ({
            ...prev,
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

    // Helper para criar o link do WhatsApp
    const getWhatsAppUrl = (number) => {
        if (!number) return null;
        const cleanNumber = number.replace(/\D/g, '');
        // Adiciona 55 se não tiver (assumindo Brasil)
        const finalNumber = cleanNumber.length >= 10 ? `55${cleanNumber}` : cleanNumber;
        return `https://wa.me/${finalNumber}`;
    };

    const totalPaidValue = (formData.pastBookings || []).reduce((acc, curr) => acc + ((parseFloat(curr.totalValue) || 0) - (parseFloat(curr.damageValue) || 0)), 0);
    const availableDogs = clientDatabase.map(c => c.dogName).filter(n => n !== formData.dogName);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 md:p-4 overflow-y-auto">
            {lightboxIndex >= 0 && <ImageLightbox images={formData.photos} currentIndex={lightboxIndex} setIndex={setLightboxIndex} onClose={() => setLightboxIndex(-1)} />}
            {vaccineLightboxIndex >= 0 && <ImageLightbox images={formData.vaccineDocs} currentIndex={vaccineLightboxIndex} setIndex={setVaccineLightboxIndex} onClose={() => setVaccineLightboxIndex(-1)} />}

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col">
                <div className="bg-primary-800 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText /> {mode === 'client_new' ? 'Novo Cadastro' : (isBookingMode ? 'Hospedagem' : 'Editar Cliente')}
                    </h2>
                    <button onClick={onClose} className="text-white hover:bg-primary-700 rounded-full p-1"><X size={24} /></button>
                </div>

                {isBookingMode && !data && (
                    <div className="bg-secondary-50 px-6 py-3 border-b border-secondary-100 relative">
                        <label className="text-sm font-bold text-primary-800 flex items-center gap-2 mb-1">
                            <Search size={16} /> Buscar Cliente Cadastrado
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }} placeholder="Digite o nome do cão..." className="w-full p-2 pl-3 border rounded shadow-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                {showSearchResults && searchQuery && (
                                    <div className="absolute left-0 right-0 bg-white shadow-xl z-20 max-h-60 overflow-y-auto border mt-1 rounded-lg">
                                        {clientDatabase.filter(c => c.dogName.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                                            <div key={c.id} onClick={() => selectClient(c)} className="p-3 hover:bg-secondary-50 cursor-pointer border-b font-medium flex justify-between">
                                                <span>{c.dogName}</span>
                                                <span className="text-sm text-secondary-500">{c.ownerName}</span>
                                            </div>
                                        ))}
                                        {clientDatabase.filter(c => c.dogName.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                            <div className="p-3 text-secondary-500 text-sm">Nenhum cliente encontrado.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onCreateClient}
                                className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 shadow-sm flex items-center gap-2 whitespace-nowrap"
                            >
                                <Plus size={18} /> Novo Pet
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* ================= COLUNA 1: PET ================= */}
                    <div className="space-y-5">
                        <h3 className="text-primary-800 font-bold border-b pb-2 flex items-center gap-2"><Dog size={18} /> Dados do Pet</h3>

                        {showReadOnly ? (
                            <div className="grid grid-cols-2 gap-4 bg-secondary-50 p-3 rounded-lg border border-secondary-200 relative">
                                <div className="absolute top-2 right-2 text-secondary-300"><Lock size={14} /></div>
                                <ReadOnlyField label="Nome" value={formData.dogName} />
                                <ReadOnlyField label="Raça" value={formData.dogBreed} />
                                <ReadOnlyField label="Porte" value={formData.dogSize} />
                                <ReadOnlyField label="Idade" value={`${realAgeYears} anos (${humanAge} humana)`} />

                                <div className="col-span-2">
                                    <span className="text-xs font-bold text-secondary-400 uppercase block mb-1">Restrições / Alergias</span>
                                    <div className="text-sm font-bold text-red-600 bg-white p-2 rounded border border-red-100">
                                        {formData.restrictions || "Nenhuma restrição registrada."}
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <span className="text-xs font-bold text-secondary-400 uppercase block mb-1">Medicações (Cadastro)</span>
                                    {formData.medications.length === 0 ? <span className="text-sm text-secondary-400 italic">-</span> : (
                                        <ul className="text-sm space-y-1">
                                            {formData.medications.map((m, i) => (
                                                <li key={i} className="bg-white p-1 rounded border border-secondary-200 flex gap-2">
                                                    <Pill size={14} className="text-red-400 mt-0.5" />
                                                    <span><b>{m.name}</b> ({m.dosage}) às {m.time}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
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
                                    <div><label className="text-sm text-secondary-500">Real</label><input readOnly value={`${realAgeYears} anos`} className="w-full p-2 border bg-secondary-100 text-xs font-bold rounded" /></div>
                                    <div><label className="text-sm text-warning">Humana</label><input readOnly value={`${humanAge} anos`} className="w-full p-2 border border-warning/30 bg-warning/10 text-warning text-xs font-bold rounded" /></div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium block mb-1">Raça</label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="relative w-full sm:flex-1">
                                            <div
                                                className="w-full p-2 border rounded bg-white flex justify-between items-center cursor-pointer"
                                                onClick={() => setIsRaceDropdownOpen(!isRaceDropdownOpen)}
                                            >
                                                <span className={`truncate ${!formData.dogBreed ? 'text-gray-500' : ''}`}>
                                                    {formData.dogBreed || 'Selecione a Raça'}
                                                </span>
                                                <ChevronDown size={16} className="text-gray-500" />
                                            </div>

                                            {isRaceDropdownOpen && (
                                                <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto mt-1">
                                                    <div className="sticky top-0 bg-white border-b p-2">
                                                        <div className="relative">
                                                            <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Buscar raça..."
                                                                className="w-full pl-8 pr-2 py-1.5 border rounded text-sm outline-none focus:border-primary-500"
                                                                value={raceSearchTerm}
                                                                onChange={(e) => setRaceSearchTerm(e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="py-1">
                                                        {races
                                                            .filter(r => r.name.toLowerCase().includes(raceSearchTerm.toLowerCase()))
                                                            .sort((a, b) => a.name.localeCompare(b.name))
                                                            .map(r => (
                                                                <div
                                                                    key={r.id}
                                                                    className="px-3 py-2 hover:bg-primary-50 flex justify-between items-center cursor-pointer group"
                                                                    onClick={() => {
                                                                        if (raceToDelete === r.id) return;
                                                                        setFormData(prev => ({ ...prev, dogBreed: r.name }));
                                                                        setIsRaceDropdownOpen(false);
                                                                        setRaceSearchTerm('');
                                                                    }}
                                                                >
                                                                    {raceToDelete === r.id ? (
                                                                        <div className="flex items-center justify-between w-full bg-red-50 p-1 rounded">
                                                                            <span className="text-xs text-red-600 font-bold">Excluir?</span>
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        onDeleteRace(r.id);
                                                                                        setRaceToDelete(null);
                                                                                    }}
                                                                                    className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1 bg-red-100 rounded"
                                                                                >
                                                                                    Sim
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        setRaceToDelete(null);
                                                                                    }}
                                                                                    className="text-gray-600 hover:text-gray-800 text-xs px-2 py-1 bg-gray-100 rounded"
                                                                                >
                                                                                    Não
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <span className="text-sm text-secondary-800">{r.name}</span>
                                                                            {onDeleteRace && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        setRaceToDelete(r.id);
                                                                                    }}
                                                                                    className="text-gray-300 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                    title="Excluir Raça"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))
                                                        }
                                                        {races.filter(r => r.name.toLowerCase().includes(raceSearchTerm.toLowerCase())).length === 0 && (
                                                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                                                                Nenhuma raça encontrada.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <input value={newRace} onChange={(e) => setNewRace(e.target.value)} placeholder="Nova Raça" className="flex-1 sm:w-32 p-2 border rounded text-sm" />
                                            <button type="button" onClick={handleAddRace} disabled={!newRace} className="bg-success text-white px-3 py-2 rounded font-bold hover:bg-green-700 flex-shrink-0" title="Adicionar Nova Raça">+</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-red-50 p-3 rounded border border-red-200">
                                    <h4 className="text-red-600 font-bold text-sm mb-2 flex gap-2"><Pill size={16} /> Medicações</h4>
                                    <div className="grid grid-cols-6 gap-2 mb-2">
                                        <input name="name" value={newMedication.name} onChange={handleMedicationChange} placeholder="Nome" className="col-span-2 p-1 border rounded text-xs" />
                                        <input name="dosage" value={newMedication.dosage} onChange={handleMedicationChange} placeholder="Dose" className="col-span-2 p-1 border rounded text-xs" />
                                        <select name="time" value={newMedication.time} onChange={handleMedicationChange} className="col-span-1 p-1 border rounded text-xs bg-white">
                                            <option value="">Hr</option>
                                            {Array.from({ length: 24 }, (_, i) => {
                                                const hour = i.toString().padStart(2, '0');
                                                return <option key={hour} value={`${hour}:00`}>{`${hour}:00`}</option>;
                                            })}
                                        </select>
                                        <button type="button" onClick={handleAddMedication} className="col-span-1 bg-red-500 text-white rounded flex items-center justify-center"><Plus size={14} /></button>
                                    </div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {formData.medications.map((m, i) => (
                                            <div key={i} className="flex justify-between bg-white p-1 rounded border text-xs">
                                                <span><b>{m.name}</b> ({m.dosage}) - {m.time}</span>
                                                <button type="button" onClick={() => handleRemoveMedication(i)} className="text-red-500"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div><label className="text-sm font-medium">Restrições</label><input name="restrictions" value={formData.restrictions} onChange={handleChange} className="w-full p-2 border border-red-200 bg-red-50 text-red-800 rounded" placeholder="Ex: Alergias..." /></div>
                            </>
                        )}

                        {/* SEÇÃO VARIÁVEIS DA HOSPEDAGEM */}
                        <div className="border-t pt-4 mt-4">
                            <h4 className="text-secondary-500 text-xs font-bold uppercase mb-3">Variáveis desta Hospedagem</h4>

                            <div className="mb-3">
                                <label className="text-sm font-medium block mb-1">Comportamento / Histórico</label>
                                <textarea name="history" value={formData.history} onChange={handleChange} rows={3} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-primary-500" placeholder="Descreva o comportamento nesta estadia..." />
                            </div>

                            <div className="bg-secondary-50 p-3 rounded border border-secondary-100 mb-3">
                                <label className="text-sm font-bold text-primary-800 block mb-1">Avaliação Geral do Cão</label>
                                <FaceRating rating={formData.dogBehaviorRating} setRating={(r) => setFormData({ ...formData, dogBehaviorRating: r })} />
                            </div>

                            <div className="mb-3">
                                <label className="text-sm font-medium block mb-1">Socialização</label>
                                <div className="relative">
                                    <div
                                        className="w-full p-2 border rounded bg-white flex justify-between items-center cursor-pointer"
                                        onClick={() => setIsSocialDropdownOpen(!isSocialDropdownOpen)}
                                    >
                                        <span className="text-sm text-gray-600">Adicionar cão...</span>
                                        <ChevronDown size={16} className="text-gray-500" />
                                    </div>
                                    {isSocialDropdownOpen && (
                                        <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto mt-1">
                                            <div className="sticky top-0 bg-white border-b p-2">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar cão..."
                                                        className="w-full pl-8 pr-2 py-1.5 border rounded text-sm outline-none focus:border-primary-500"
                                                        value={socialSearchTerm}
                                                        onChange={(e) => setSocialSearchTerm(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="py-1">
                                                {availableDogs
                                                    .filter(dog => dog.toLowerCase().includes(socialSearchTerm.toLowerCase()) && !formData.socialization.includes(dog))
                                                    .sort()
                                                    .map((dog, index) => (
                                                        <div
                                                            key={index}
                                                            className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                                                            onClick={() => {
                                                                if (formData.socialization.length < 5) {
                                                                    setFormData(prev => ({ ...prev, socialization: [...prev.socialization, dog] }));
                                                                    setIsSocialDropdownOpen(false);
                                                                    setSocialSearchTerm('');
                                                                }
                                                            }}
                                                        >
                                                            {dog}
                                                        </div>
                                                    ))
                                                }
                                                {availableDogs.filter(dog => dog.toLowerCase().includes(socialSearchTerm.toLowerCase()) && !formData.socialization.includes(dog)).length === 0 && (
                                                    <div className="px-3 py-4 text-center text-sm text-gray-500">
                                                        Nenhum cão encontrado.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.socialization.map((dog, i) => (
                                        <span key={i} className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                            {dog}
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, socialization: prev.socialization.filter((_, idx) => idx !== i) }))} className="hover:text-red-600"><X size={12} /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ================= COLUNA 2: TUTOR & HOSPEDAGEM ================= */}
                    <div className="space-y-6">
                        <h3 className="text-secondary-800 font-bold border-b pb-2 flex items-center gap-2"><User size={18} /> Dados do Tutor</h3>

                        {showReadOnly ? (
                            <div className="bg-secondary-50 p-3 rounded-lg border border-secondary-200 relative">
                                <div className="absolute top-2 right-2 text-secondary-300"><Lock size={14} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <ReadOnlyField label="Tutor 1" value={formData.ownerName} icon={User} />
                                    <ReadOnlyField label="WhatsApp 1" value={formData.whatsapp} icon={MessageCircle} />
                                    <ReadOnlyField label="Tutor 2" value={formData.ownerName2} icon={User} />
                                    <ReadOnlyField label="WhatsApp 2" value={formData.whatsapp2} icon={MessageCircle} />
                                </div>
                                <ReadOnlyField label="Endereço" value={formData.address} />
                                <div className="mt-2">
                                    <span className="text-xs font-bold text-secondary-400 uppercase block mb-1">Histórico do Tutor</span>
                                    <p className="text-sm text-secondary-700 bg-white p-2 rounded border border-secondary-100 italic">
                                        {formData.ownerHistory || "Sem observações."}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-sm font-medium">Tutor 1</label><input name="ownerName" value={formData.ownerName} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
                                    <div><label className="text-sm font-medium">WhatsApp 1</label><input name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full p-2 border rounded" placeholder="(00) 00000-0000" required /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-sm font-medium">Tutor 2</label><input name="ownerName2" value={formData.ownerName2} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                                    <div><label className="text-sm font-medium">WhatsApp 2</label><input name="whatsapp2" value={formData.whatsapp2} onChange={handleChange} className="w-full p-2 border rounded" placeholder="(00) 00000-0000" /></div>
                                </div>
                                <div><label className="text-sm font-medium">Endereço</label><input name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-sm font-medium">Histórico do Tutor</label><textarea name="ownerHistory" value={formData.ownerHistory} onChange={handleChange} rows={2} className="w-full p-2 border rounded" /></div>
                            </div>
                        )}

                        {isBookingMode && (
                            <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 mt-6">
                                <h3 className="text-primary-800 font-bold border-b border-primary-200 pb-2 mb-3 flex items-center gap-2"><CalendarIcon size={18} /> Dados da Reserva</h3>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div><label className="text-sm font-bold text-primary-700">Check-in</label><input type="datetime-local" name="checkIn" value={formData.checkIn} onChange={handleChange} className="w-full p-2 border rounded bg-white" required /></div>
                                    <div><label className="text-sm font-bold text-primary-700">Check-out</label><input type="datetime-local" name="checkOut" value={formData.checkOut} onChange={handleChange} className="w-full p-2 border rounded bg-white" required /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div><label className="text-sm font-medium">Diária (R$)</label><input type="number" name="dailyRate" value={formData.dailyRate} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                                    <div><label className="text-sm font-bold text-success-700">Total (R$)</label><input type="number" name="totalValue" value={formData.totalValue} readOnly className="w-full p-2 border rounded bg-success-50 font-bold text-success-800" /></div>
                                </div>
                            </div>
                        )}

                        {/* UPLOAD DE FOTOS E VACINAS */}
                        <div className="mt-6 space-y-4">
                            <div>
                                <label className="text-sm font-bold flex items-center gap-2 mb-2"><Camera size={16} /> Fotos do Pet (Max 5)</label>
                                <div className="flex flex-wrap gap-2">
                                    {formData.photos.map((url, i) => (
                                        <div key={i} className="relative w-16 h-16 group">
                                            <img src={url} alt="Pet" className="w-full h-full object-cover rounded-lg cursor-pointer border hover:border-primary-500" onClick={() => setLightboxIndex(i)} />
                                            <button type="button" onClick={() => removePhoto(i, 'photos')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X size={12} /></button>
                                        </div>
                                    ))}
                                    {formData.photos.length < 5 && (
                                        <label className={`w-16 h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-secondary-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <Upload size={20} className="text-secondary-400" />
                                            <span className="text-[10px] text-secondary-400">Add</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'photos')} disabled={isUploading} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold flex items-center gap-2 mb-2"><FilePlus size={16} /> Carteira de Vacinação (Max 3)</label>
                                <div className="flex flex-wrap gap-2">
                                    {formData.vaccineDocs.map((url, i) => (
                                        <div key={i} className="relative w-16 h-16 group">
                                            <img src={url} alt="Vacina" className="w-full h-full object-cover rounded-lg cursor-pointer border hover:border-primary-500" onClick={() => setVaccineLightboxIndex(i)} />
                                            <button type="button" onClick={() => removePhoto(i, 'vaccines')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X size={12} /></button>
                                        </div>
                                    ))}
                                    {formData.vaccineDocs.length < 3 && (
                                        <label className={`w-16 h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-secondary-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <Upload size={20} className="text-secondary-400" />
                                            <span className="text-[10px] text-secondary-400">Add</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'vaccines')} disabled={isUploading} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* HISTÓRICO FINANCEIRO E DE ESTADIAS */}
                        {formData.pastBookings.length > 0 && (
                            <div className="mt-6 border-t pt-4">
                                <h4 className="text-sm font-bold flex items-center gap-2 mb-3"><History size={16} /> Histórico de Estadias</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {formData.pastBookings.map((h) => (
                                        <div key={h.id} className="text-xs bg-secondary-50 p-2 rounded border flex justify-between items-center group">
                                            <div>
                                                <span className="font-bold">{new Date(h.checkIn).toLocaleDateString('pt-BR')}</span>
                                                <span className="mx-1">à</span>
                                                <span className="font-bold">{new Date(h.checkOut).toLocaleDateString('pt-BR')}</span>
                                                <div className="text-secondary-500">Total: {formatCurrency(h.totalValue)}</div>
                                            </div>
                                            <button type="button" onClick={() => handleDeleteHistoryItem(h.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 text-right text-xs font-bold text-primary-700">
                                    Total Gasto: {formatCurrency(totalPaidValue)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BOTÕES DE AÇÃO */}
                    <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-6 border-t mt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-secondary-300 text-secondary-600 font-bold hover:bg-secondary-50">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-8 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-lg flex items-center gap-2">
                            {isSaving ? 'Salvando...' : <><CheckCircle size={20} /> Salvar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}