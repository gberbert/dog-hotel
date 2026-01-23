import React, { useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { FaceRating } from '../shared/RatingComponents';

export default function BookingVariablesForm({ formData, handleChange, setFormData, clientDatabase }) {
    const [isSocialDropdownOpen, setIsSocialDropdownOpen] = useState(false);
    const [socialSearchTerm, setSocialSearchTerm] = useState('');

    // Filtros para Socialização
    const availableDogs = clientDatabase ? clientDatabase.map(c => c.dogName).filter(n => n !== formData.dogName) : [];

    return (
        <div className="border-t pt-4 mt-4">
            <h4 className="text-secondary-500 text-xs font-bold uppercase mb-3">Variáveis desta Hospedagem</h4>

            {/* Comportamento / Histórico */}
            <div className="mb-3">
                <label className="text-sm font-medium block mb-1">Comportamento / Histórico</label>
                <textarea
                    name="history"
                    value={formData.history}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Descreva o comportamento nesta estadia..."
                />
            </div>

            {/* Avaliação Geral */}
            <div className="bg-secondary-50 p-3 rounded border border-secondary-100 mb-3">
                <label className="text-sm font-bold text-primary-800 block mb-1">Avaliação Geral do Cão</label>
                <FaceRating
                    rating={formData.dogBehaviorRating}
                    setRating={(r) => setFormData(prev => ({ ...prev, dogBehaviorRating: r }))}
                />
            </div>

            {/* Socialização */}
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
                                    <input
                                        type="text"
                                        placeholder="Buscar cão..."
                                        className="w-full pl-8 pr-2 py-1.5 border rounded text-sm outline-none"
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
    );
}
