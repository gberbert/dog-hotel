import React, { useState, useEffect } from 'react';
import { FileText, Plus, X, CheckCircle, Search, Camera, FilePlus, History, Trash2, Upload, Calendar as CalendarIcon, Syringe, Eye, Printer } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateDoc, doc } from 'firebase/firestore';
import { db, storage, appId } from '../utils/firebase';
import { compressImage } from '../utils/fileHelpers';
import { calculateTotalDays, formatCurrency } from '../utils/calculations';
import ImageLightbox from './shared/ImageLightbox';

// Sub-Componentes (Caminhos ajustados)
import PetForm from './booking/PetForm';
import OwnerForm from './booking/OwnerForm';
import BookingDetailsForm from './booking/BookingDetailsForm';
import PDFHeader from './shared/PDFHeader';

export default function BookingModal({ data, mode, bookings, clientDatabase, onSave, onClose, races, onAddRace, onDeleteRace, onCreateClient, onOpenBooking }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [vaccineLightboxIndex, setVaccineLightboxIndex] = useState(-1);

    const isBookingMode = mode === 'booking';
    const showReadOnly = isBookingMode;

    const [formData, setFormData] = useState({
        clientId: '', dogName: '', dogSize: 'Pequeno', dogBreed: 'Sem Raça Definida (SRD)', source: 'Particular',
        ownerName: '', whatsapp: '', ownerName2: '', whatsapp2: '',
        ownerEmail: '', ownerDoc: '', address: '', birthYear: '',
        history: '', ownerHistory: '', ownerRating: 3, restrictions: '',
        socialization: [], medications: [],
        checkIn: '', checkOut: '', rating: 5, dailyRate: 80, dogBehaviorRating: 3,
        totalValue: 0, damageValue: '', damageDescription: '',
        photos: [], vaccineDocs: [], pastBookings: [],
        // Campos de Vacina
        lastAntiRabica: '', lastMultipla: ''
    });

    // Carga de dados inicial
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            clientId: data?.clientId || (mode.startsWith('client') && data?.id ? data.id : '') || '',
            dogName: data?.dogName || '', dogSize: data?.dogSize || 'Pequeno',
            dogBreed: data?.dogBreed || 'Sem Raça Definida (SRD)', source: data?.source || 'Particular',
            ownerName: data?.ownerName || '', whatsapp: data?.whatsapp || '',
            ownerName2: data?.ownerName2 || '', whatsapp2: data?.whatsapp2 || '',
            ownerEmail: data?.ownerEmail || '', ownerDoc: data?.ownerDoc || '',
            address: data?.address || '', birthYear: data?.birthYear || '',
            history: data?.history || '', ownerHistory: data?.ownerHistory || '',
            ownerRating: data?.ownerRating || 3, restrictions: data?.restrictions || '',
            socialization: data?.socialization || [], medications: data?.medications || [],
            checkIn: data?.checkIn || '', checkOut: data?.checkOut || '',
            rating: data?.rating || 5, dailyRate: data?.dailyRate || 80,
            dogBehaviorRating: data?.dogBehaviorRating || 3,
            totalValue: data?.totalValue || 0,
            damageValue: data?.damageValue || '', damageDescription: data?.damageDescription || '',
            photos: data?.photos || [], vaccineDocs: data?.vaccineDocs || [],
            pastBookings: data?.pastBookings || [],
            // Carrega datas salvas ou vazio
            lastAntiRabica: data?.lastAntiRabica || '',
            lastMultipla: data?.lastMultipla || ''
        }));
    }, [data, mode]);

    // Cálculo automático do total
    useEffect(() => {
        if (isBookingMode && formData.checkIn && formData.checkOut && formData.dailyRate) {
            const days = calculateTotalDays(formData.checkIn, formData.checkOut);
            const dailyRateFloat = parseFloat(formData.dailyRate) || 0;
            const total = days * dailyRateFloat;
            setFormData(prev => ({ ...prev, totalValue: Number(total.toFixed(2)) }));
        }
    }, [formData.checkIn, formData.checkOut, formData.dailyRate, isBookingMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Validação de Datas (Hotel UX)
            if (name === 'checkIn' && value) {
                // Se mudou checkIn, garante que checkout seja >= checkin
                if (newData.checkOut && newData.checkOut < value) {
                    newData.checkOut = value;
                }
            }
            if (name === 'checkOut' && value) {
                // Se tentou mudar checkout para antes do checkin, força igual
                if (newData.checkIn && value < newData.checkIn) {
                    newData.checkOut = newData.checkIn;
                }
            }
            return newData;
        });
    };

    // --- MANIPULADOR DE SUBMIT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error("Erro no Modal:", error);
            alert("Ocorreu um erro ao salvar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Lógica de Upload
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
            photos: client.photos || [], vaccineDocs: client.vaccineDocs || [],
            lastAntiRabica: client.lastAntiRabica || '', lastMultipla: client.lastMultipla || '',
            pastBookings: client.pastBookings || []
        }));
        setSearchQuery(''); setShowSearchResults(false);
    };

    const totalPaidValue = (formData.pastBookings || []).reduce((acc, curr) => acc + ((parseFloat(curr.totalValue) || 0) - (parseFloat(curr.damageValue) || 0)), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 md:p-4 overflow-y-auto">
            {lightboxIndex >= 0 && <ImageLightbox images={formData.photos} currentIndex={lightboxIndex} setIndex={setLightboxIndex} onClose={() => setLightboxIndex(-1)} />}
            {vaccineLightboxIndex >= 0 && <ImageLightbox images={formData.vaccineDocs} currentIndex={vaccineLightboxIndex} setIndex={setVaccineLightboxIndex} onClose={() => setVaccineLightboxIndex(-1)} />}

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col">
                <div className="bg-primary-800 px-6 py-4 flex justify-between items-center sticky top-0 z-10 print:hidden">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText /> {mode === 'client_new' ? 'Novo Cadastro' : (isBookingMode ? 'Hospedagem' : 'Editar Cliente')}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => window.print()} className="text-white hover:bg-primary-700 rounded-full p-2" title="Imprimir / Salvar PDF">
                            <Printer size={24} />
                        </button>
                        <button onClick={onClose} className="text-white hover:bg-primary-700 rounded-full p-1"><X size={24} /></button>
                    </div>
                </div>

                {/* CABEÇALHO APENAS PARA IMPRESSÃO */}
                <div className="hidden print:block">
                    <PDFHeader />
                </div>

                {isBookingMode && !data && (
                    <div className="bg-secondary-50 px-6 py-3 border-b border-secondary-100 relative print:hidden">
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
                                    </div>
                                )}
                            </div>
                            <button type="button" onClick={onCreateClient} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 shadow-sm flex items-center gap-2 whitespace-nowrap"><Plus size={18} /> Novo Pet</button>
                        </div>
                    </div>
                )}

                {/* FORMULÁRIO */}
                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                    <PetForm
                        formData={formData}
                        handleChange={handleChange}
                        setFormData={setFormData}
                        showReadOnly={showReadOnly}
                        races={races}
                        onAddRace={onAddRace}
                        onDeleteRace={onDeleteRace}
                        clientDatabase={clientDatabase}
                    />

                    <div className="space-y-6">
                        <OwnerForm
                            formData={formData}
                            handleChange={handleChange}
                            showReadOnly={showReadOnly}
                        />

                        {isBookingMode && (
                            <BookingDetailsForm
                                formData={formData}
                                handleChange={handleChange}
                                minCheckOut={formData.checkIn}
                            />
                        )}

                        <div className="mt-6 space-y-4">
                            {/* Fotos do Pet */}
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
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'photos')} disabled={isUploading} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Carteira de Vacinação + Datas */}
                            <div className="bg-secondary-50 p-3 rounded-lg border border-secondary-200">
                                <label className="text-sm font-bold flex items-center gap-2 mb-2"><FilePlus size={16} /> Carteira de Vacinação</label>

                                {/* Uploads */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {formData.vaccineDocs.map((url, i) => (
                                        <div key={i} className="relative w-16 h-16 group">
                                            <img src={url} alt="Vacina" className="w-full h-full object-cover rounded-lg cursor-pointer border hover:border-primary-500" onClick={() => setVaccineLightboxIndex(i)} />
                                            <button type="button" onClick={() => removePhoto(i, 'vaccines')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X size={12} /></button>
                                        </div>
                                    ))}
                                    {formData.vaccineDocs.length < 3 && (
                                        <label className={`w-16 h-16 border-2 border-dashed bg-white rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-secondary-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <Upload size={20} className="text-secondary-400" />
                                            <span className="text-[10px] text-secondary-400">Add</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'vaccines')} disabled={isUploading} />
                                        </label>
                                    )}
                                </div>

                                {/* NOVOS CAMPOS DE DATA (Layout Mobile Otimizado) */}
                                <div className="border-t border-secondary-200 pt-3">
                                    <label className="text-xs font-bold text-secondary-500 flex items-center gap-1 mb-2"><Syringe size={14} /> Últimas Doses</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-primary-700 uppercase mb-1 block">Anti-Rábica</label>
                                            <input
                                                type="date"
                                                name="lastAntiRabica"
                                                value={formData.lastAntiRabica}
                                                onChange={handleChange}
                                                className="w-full p-2 border border-secondary-300 rounded text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-primary-700 uppercase mb-1 block">Multi V8 / V10</label>
                                            <input
                                                type="date"
                                                name="lastMultipla"
                                                value={formData.lastMultipla}
                                                onChange={handleChange}
                                                className="w-full p-2 border border-secondary-300 rounded text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Histórico */}
                        {formData.pastBookings.length > 0 && (
                            <div className="mt-6 border-t pt-4">
                                <h4 className="text-sm font-bold flex items-center gap-2 mb-3"><History size={16} /> Histórico de Estadias</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {formData.pastBookings.map((h) => {
                                        // Tenta encontrar a reserva real para dados atualizados
                                        const cleanId = h.id ? h.id.toString().replace('_hist', '') : '';
                                        const realBooking = bookings ? bookings.find(b =>
                                            b.id === cleanId ||
                                            (b.checkIn === h.checkIn && b.checkOut === h.checkOut && b.clientId === formData.clientId)
                                        ) : null;

                                        // Usa dados reais se disponiveis, senão histórico
                                        const sourceDisplay = realBooking?.source || h.source || 'Particular';
                                        const valueDisplay = realBooking ? ((parseFloat(realBooking.totalValue) || 0) - (parseFloat(realBooking.damageValue) || 0)) : ((parseFloat(h.totalValue) || 0) - (parseFloat(h.damageValue) || 0));

                                        return (
                                            <div key={h.id} className="text-xs bg-secondary-50 p-2 rounded border flex justify-between items-center group">
                                                <div>
                                                    <span className="font-bold">{new Date(h.checkIn).toLocaleDateString('pt-BR')}</span>
                                                    <span className="mx-1">à</span>
                                                    <span className="font-bold">{new Date(h.checkOut).toLocaleDateString('pt-BR')}</span>
                                                    <div className="text-secondary-500">Total: {formatCurrency(valueDisplay)}</div>
                                                    <div className="text-[10px] font-bold uppercase text-primary-600 mt-0.5">{sourceDisplay}</div>
                                                </div>
                                                <div className="flex items-center">
                                                    {onOpenBooking && (
                                                        <button type="button" onClick={() => onOpenBooking(h)} className="text-primary-500 hover:text-primary-700 mr-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition" title="Ver Hospedagem">
                                                            <Eye size={16} />
                                                        </button>
                                                    )}
                                                    <button type="button" onClick={() => handleDeleteHistoryItem(h.id)} className="text-red-400 hover:text-red-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-2 text-right text-xs font-bold text-primary-700">
                                    Total Gasto: {formatCurrency(totalPaidValue)}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-6 border-t mt-4 print:hidden">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-secondary-300 text-secondary-600 font-bold hover:bg-secondary-50">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-8 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-lg flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                            {isSaving ? 'Salvando...' : <><CheckCircle size={20} /> Salvar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}