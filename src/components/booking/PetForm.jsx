import React, { useState, useRef } from 'react';
import { Dog, Pill, Plus, X, Search, ChevronDown, Trash2, Lock, Edit2, Check, AlertCircle } from 'lucide-react';
import { FaceRating } from '../shared/RatingComponents';

export default function PetForm({
    formData, handleChange, setFormData, showReadOnly,
    races, onAddRace, onDeleteRace, clientDatabase
}) {
    // Estados locais de UI (movidos do Modal Principal para cá)
    const [isRaceDropdownOpen, setIsRaceDropdownOpen] = useState(false);
    const [raceSearchTerm, setRaceSearchTerm] = useState('');
    const [raceToDelete, setRaceToDelete] = useState(null);
    const [newRace, setNewRace] = useState('');

    const [newMedication, setNewMedication] = useState({ name: '', dosage: '', time: '' });
    const [editingMedicationIndex, setEditingMedicationIndex] = useState(-1);
    const medicationInputRef = useRef(null);

    const [isSocialDropdownOpen, setIsSocialDropdownOpen] = useState(false);
    const [socialSearchTerm, setSocialSearchTerm] = useState('');

    // Helpers de Cálculo de Idade
    const calculateAge = (birthYear) => {
        if (!birthYear) return 0;
        return Math.max(0, new Date().getFullYear() - parseInt(birthYear));
    };

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

    const realAgeYears = calculateAge(formData.birthYear);
    const humanAge = calculateHumanAge(realAgeYears, formData.dogSize);

    // Filtros
    const availableDogs = clientDatabase ? clientDatabase.map(c => c.dogName).filter(n => n !== formData.dogName) : [];

    // Handlers Locais
    const handleAddRaceClick = async () => {
        if (newRace && !races.map(r => r.name.toLowerCase()).includes(newRace.toLowerCase())) {
            await onAddRace(newRace);
            setFormData(prev => ({ ...prev, dogBreed: newRace }));
            setNewRace('');
        }
    };

    const handleMedicationChange = (e) => setNewMedication(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleAddMedication = () => {
        if (newMedication.name && newMedication.dosage && newMedication.time) {
            setFormData(prev => {
                const newList = [...(prev.medications || [])];
                if (editingMedicationIndex >= 0) {
                    newList[editingMedicationIndex] = newMedication;
                } else {
                    newList.push(newMedication);
                }
                return { ...prev, medications: newList };
            });
            setNewMedication({ name: '', dosage: '', time: '' });
            setEditingMedicationIndex(-1);
        }
    };

    const handleEditMedication = (index) => {
        // Clona o objeto para garantir atualização de estado
        const item = { ...formData.medications[index] };
        setNewMedication(item);
        setEditingMedicationIndex(index);

        // Scroll para os inputs e foca
        if (medicationInputRef.current) {
            medicationInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Tenta focar no primeiro input
            const firstInput = medicationInputRef.current.querySelector('input');
            if (firstInput) firstInput.focus();
        }
    };

    const handleCancelMedicationEdit = () => {
        setNewMedication({ name: '', dosage: '', time: '' });
        setEditingMedicationIndex(-1);
    };

    return (
        <div className="space-y-5">
            <h3 className="text-primary-800 font-bold border-b pb-2 flex items-center gap-2"><Dog size={18} /> Dados do Pet</h3>

            {showReadOnly ? (
                <div className="grid grid-cols-2 gap-4 bg-secondary-50 p-3 rounded-lg border border-secondary-200 relative">
                    <div className="absolute top-2 right-2 text-secondary-300"><Lock size={14} /></div>

                    <div className="mb-3">
                        <span className="text-xs font-bold text-secondary-400 uppercase block">Nome</span>
                        <div className="text-sm font-medium">{formData.dogName}</div>
                    </div>
                    <div className="mb-3">
                        <span className="text-xs font-bold text-secondary-400 uppercase block">Raça</span>
                        <div className="text-sm font-medium">{formData.dogBreed}</div>
                    </div>
                    <div className="mb-3">
                        <span className="text-xs font-bold text-secondary-400 uppercase block">Porte</span>
                        <div className="text-sm font-medium">{formData.dogSize}</div>
                    </div>
                    <div className="mb-3">
                        <span className="text-xs font-bold text-secondary-400 uppercase block">Idade</span>
                        <div className="text-sm font-medium">{realAgeYears} anos ({humanAge} humana)</div>
                    </div>

                    <div className="col-span-2">
                        <span className="text-xs font-bold text-secondary-400 uppercase block mb-1">Restrições</span>
                        <div className="text-sm font-bold text-red-600 bg-white p-2 rounded border border-red-100">
                            {formData.restrictions || "Nenhuma restrição registrada."}
                        </div>
                    </div>

                    <div className="col-span-2">
                        <span className="text-xs font-bold text-secondary-400 uppercase block mb-1">Medicações</span>
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
                        <div>
                            <label className="text-sm font-medium">Nasc.</label>
                            <select name="birthYear" value={formData.birthYear} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                                <option value="">Ano</option>
                                {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div><label className="text-sm text-secondary-500">Real</label><input readOnly value={`${realAgeYears} anos`} className="w-full p-2 border bg-secondary-100 text-xs font-bold rounded" /></div>
                        <div><label className="text-sm text-warning">Humana</label><input readOnly value={`${humanAge} anos`} className="w-full p-2 border border-warning/30 bg-warning/10 text-warning text-xs font-bold rounded" /></div>
                    </div>

                    {/* SELEÇÃO DE RAÇA */}
                    <div>
                        <label className="text-sm font-medium block mb-1">Raça</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative w-full sm:flex-1">
                                <div className="w-full p-2 border rounded bg-white flex justify-between items-center cursor-pointer" onClick={() => setIsRaceDropdownOpen(!isRaceDropdownOpen)}>
                                    <span className={`truncate ${!formData.dogBreed ? 'text-gray-500' : ''}`}>{formData.dogBreed || 'Selecione a Raça'}</span>
                                    <ChevronDown size={16} className="text-gray-500" />
                                </div>
                                {isRaceDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto mt-1">
                                        <div className="sticky top-0 bg-white border-b p-2">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                                <input type="text" placeholder="Buscar raça..." className="w-full pl-8 pr-2 py-1.5 border rounded text-sm outline-none" value={raceSearchTerm} onChange={(e) => setRaceSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} autoFocus />
                                            </div>
                                        </div>
                                        <div className="py-1">
                                            {races.filter(r => r.name.toLowerCase().includes(raceSearchTerm.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)).map(r => (
                                                <div key={r.id} className="px-3 py-2 hover:bg-primary-50 flex justify-between items-center cursor-pointer group" onClick={() => { if (raceToDelete === r.id) return; setFormData(prev => ({ ...prev, dogBreed: r.name })); setIsRaceDropdownOpen(false); setRaceSearchTerm(''); }}>
                                                    {raceToDelete === r.id ? (
                                                        <div className="flex items-center justify-between w-full bg-red-50 p-1 rounded">
                                                            <span className="text-xs text-red-600 font-bold">Excluir?</span>
                                                            <div className="flex gap-2">
                                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteRace(r.id); setRaceToDelete(null); }} className="text-red-600 text-xs font-bold px-2 py-1 bg-red-100 rounded">Sim</button>
                                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRaceToDelete(null); }} className="text-gray-600 text-xs px-2 py-1 bg-gray-100 rounded">Não</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="text-sm text-secondary-800">{r.name}</span>
                                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRaceToDelete(r.id); }} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <input value={newRace} onChange={(e) => setNewRace(e.target.value)} placeholder="Nova" className="flex-1 sm:w-20 p-2 border rounded text-sm" />
                                <button type="button" onClick={handleAddRaceClick} disabled={!newRace} className="bg-success text-white px-3 py-2 rounded font-bold hover:bg-green-700">+</button>
                            </div>
                        </div>
                    </div>

                    {/* MEDICAÇÕES */}
                    <div className={`p-3 rounded border transition-colors duration-300 ${editingMedicationIndex >= 0 ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-200' : 'bg-red-50 border-red-200'}`} ref={medicationInputRef}>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className={`font-bold text-sm flex gap-2 ${editingMedicationIndex >= 0 ? 'text-yellow-700' : 'text-red-600'}`}>
                                {editingMedicationIndex >= 0 ? <><Edit2 size={16} /> Editando Medicação</> : <><Pill size={16} /> Medicações</>}
                            </h4>
                            {editingMedicationIndex >= 0 && <span className="text-xs text-yellow-600 font-medium animate-pulse">Preencha e confirme abaixo</span>}
                        </div>

                        <div className="grid grid-cols-6 gap-2 mb-2">
                            <input name="name" value={newMedication.name} onChange={handleMedicationChange} placeholder="Nome" className="col-span-2 p-1 border rounded text-xs" />
                            <input name="dosage" value={newMedication.dosage} onChange={handleMedicationChange} placeholder="Dose" className="col-span-2 p-1 border rounded text-xs" />
                            <select name="time" value={newMedication.time} onChange={handleMedicationChange} className="col-span-1 p-1 border rounded text-xs bg-white">
                                <option value="">Hr</option>
                                {Array.from({ length: 48 }, (_, i) => {
                                    const h = Math.floor(i / 2).toString().padStart(2, '0');
                                    const m = i % 2 === 0 ? '00' : '30';
                                    const t = `${h}:${m}`;
                                    return <option key={t} value={t}>{t}</option>;
                                })}
                            </select>
                            {editingMedicationIndex >= 0 ? (
                                <div className="col-span-1 flex gap-1">
                                    <button type="button" onClick={(e) => { e.preventDefault(); handleAddMedication(); }} className="flex-1 bg-green-500 text-white rounded flex items-center justify-center hover:bg-green-600 transition" title="Confirmar Edição"><Check size={14} /></button>
                                    <button type="button" onClick={(e) => { e.preventDefault(); handleCancelMedicationEdit(); }} className="flex-1 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600 transition" title="Cancelar"><X size={14} /></button>
                                </div>
                            ) : (
                                <button type="button" onClick={(e) => { e.preventDefault(); handleAddMedication(); }} className="col-span-1 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600 transition"><Plus size={14} /></button>
                            )}
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto bg-white rounded border border-secondary-200 p-1">
                            {formData.medications.map((m, i) => (
                                <div key={i} className={`flex justify-between p-2 rounded border-b last:border-0 text-xs transition-colors ${editingMedicationIndex === i ? 'bg-yellow-50 text-yellow-800' : 'hover:bg-gray-50'}`}>
                                    <span className="flex items-center gap-1">
                                        {editingMedicationIndex === i && <Edit2 size={10} className="text-yellow-600" />}
                                        <b>{m.name}</b> ({m.dosage}) - {m.time}
                                    </span>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditMedication(i); }} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition" title="Editar"><Edit2 size={14} /></button>
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData(prev => ({ ...prev, medications: prev.medications.filter((_, idx) => idx !== i) })) }} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition" title="Excluir"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div><label className="text-sm font-medium">Restrições</label><input name="restrictions" value={formData.restrictions} onChange={handleChange} className="w-full p-2 border border-red-200 bg-red-50 text-red-800 rounded" placeholder="Ex: Alergias..." /></div>
                </>
            )}

            {/* VARIÁVEIS DA HOSPEDAGEM */}
            <div className="border-t pt-4 mt-4">
                <h4 className="text-secondary-500 text-xs font-bold uppercase mb-3">Variáveis desta Hospedagem</h4>
                <div className="mb-3">
                    <label className="text-sm font-medium block mb-1">Comportamento / Histórico</label>
                    <textarea name="history" value={formData.history} onChange={handleChange} rows={3} className="w-full p-2 border rounded text-sm" placeholder="Descreva o comportamento nesta estadia..." />
                </div>
                <div className="bg-secondary-50 p-3 rounded border border-secondary-100 mb-3">
                    <label className="text-sm font-bold text-primary-800 block mb-1">Avaliação Geral do Cão</label>
                    <FaceRating rating={formData.dogBehaviorRating} setRating={(r) => setFormData(prev => ({ ...prev, dogBehaviorRating: r }))} />
                </div>

                {/* SOCIALIZAÇÃO */}
                <div className="mb-3">
                    <label className="text-sm font-medium block mb-1">Socialização</label>
                    <div className="relative">
                        <div className="w-full p-2 border rounded bg-white flex justify-between items-center cursor-pointer" onClick={() => setIsSocialDropdownOpen(!isSocialDropdownOpen)}>
                            <span className="text-sm text-gray-600">Adicionar cão...</span>
                            <ChevronDown size={16} className="text-gray-500" />
                        </div>
                        {isSocialDropdownOpen && (
                            <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto mt-1">
                                <div className="sticky top-0 bg-white border-b p-2">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                        <input type="text" placeholder="Buscar cão..." className="w-full pl-8 pr-2 py-1.5 border rounded text-sm outline-none" value={socialSearchTerm} onChange={(e) => setSocialSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} autoFocus />
                                    </div>
                                </div>
                                <div className="py-1">
                                    {availableDogs
                                        .filter(dog => dog.toLowerCase().includes(socialSearchTerm.toLowerCase()) && !formData.socialization.includes(dog))
                                        .sort()
                                        .map((dog, index) => (
                                            <div key={index} className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm" onClick={() => { if (formData.socialization.length < 5) { setFormData(prev => ({ ...prev, socialization: [...prev.socialization, dog] })); setIsSocialDropdownOpen(false); setSocialSearchTerm(''); } }}>{dog}</div>
                                        ))
                                    }
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
    );
}