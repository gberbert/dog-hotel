import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function BookingDetailsForm({ formData, handleChange }) {
  return (
    <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 mt-6">
        <h3 className="text-primary-800 font-bold border-b border-primary-200 pb-2 mb-3 flex items-center gap-2">
            <CalendarIcon size={18} /> Dados da Reserva
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
                <label className="text-sm font-bold text-primary-700">Check-in</label>
                <input type="datetime-local" name="checkIn" value={formData.checkIn} onChange={handleChange} className="w-full p-2 border rounded bg-white" required />
            </div>
            <div>
                <label className="text-sm font-bold text-primary-700">Check-out</label>
                <input type="datetime-local" name="checkOut" value={formData.checkOut} onChange={handleChange} className="w-full p-2 border rounded bg-white" required />
            </div>
        </div>
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