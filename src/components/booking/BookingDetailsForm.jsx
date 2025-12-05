import React from 'react';
import { Calendar as CalendarIcon, MapPin } from 'lucide-react';

export default function BookingDetailsForm({ formData, handleChange, minCheckOut }) {
    return (
        <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 mt-6">
            <h3 className="text-primary-800 font-bold border-b border-primary-200 pb-2 mb-3 flex items-center gap-2">
                <CalendarIcon size={18} /> Dados da Reserva
            </h3>

            {/* SELEÇÃO DE ORIGEM (NOVO) */}
            <div className="mb-4">
                <label className="text-xs font-bold text-primary-700 uppercase mb-2 block flex items-center gap-1">
                    <MapPin size={12} /> Origem da Reserva
                </label>
                <div className="flex gap-3">
                    <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 rounded-lg border transition-all ${formData.source === 'Particular' ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white text-secondary-600 border-secondary-200 hover:bg-secondary-50'}`}>
                        <input
                            type="radio"
                            name="source"
                            value="Particular"
                            checked={formData.source === 'Particular'}
                            onChange={handleChange}
                            className="hidden"
                        />
                        <span className="text-sm font-bold">Particular</span>
                    </label>

                    <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 rounded-lg border transition-all ${formData.source === 'DogHero' ? 'bg-[#ff4057] text-white border-[#ff4057] shadow-md' : 'bg-white text-secondary-600 border-secondary-200 hover:bg-secondary-50'}`}>
                        <input
                            type="radio"
                            name="source"
                            value="DogHero"
                            checked={formData.source === 'DogHero'}
                            onChange={handleChange}
                            className="hidden"
                        />
                        <span className="text-sm font-bold">DogHero</span>
                    </label>
                </div>
            </div>

            {/* DATAS */}
            <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <label className="text-sm font-bold text-primary-700">Check-in</label>
                    <input type="datetime-local" name="checkIn" value={formData.checkIn} onChange={handleChange} className="w-full p-2 border rounded bg-white" required />
                </div>
                <div>
                    <label className="text-sm font-bold text-primary-700">Check-out</label>
                    <input type="datetime-local" name="checkOut" value={formData.checkOut} min={minCheckOut} onChange={handleChange} className="w-full p-2 border rounded bg-white" required />
                </div>
            </div>

            {/* VALORES */}
            <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <label className="text-sm font-medium">Diária (R$)</label>
                    <input type="number" name="dailyRate" value={formData.dailyRate} onChange={handleChange} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="text-sm font-bold text-success-700">Total (R$)</label>
                    <input type="number" name="totalValue" value={formData.totalValue} readOnly className="w-full p-2 border rounded bg-success-50 font-bold text-success-800" />
                </div>
            </div>
        </div>
    );
}