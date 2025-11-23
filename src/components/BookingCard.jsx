import React from 'react';
import {
  Clock, User, MessageCircle, Trash2, Edit, AlertTriangle, Dog
} from 'lucide-react';
import { formatCurrency, getBookingStatus } from '../utils/calculations';
import { FaceRating } from './shared/RatingComponents';

export default function BookingCard({ booking, onEdit, onDelete }) {
  const status = getBookingStatus(booking.checkIn, booking.checkOut);
  const totalNetValue = (parseFloat(booking.totalValue) || 0) - (parseFloat(booking.damageValue) || 0);

  const formatDateShort = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
  };

  const getWhatsAppLink = (number) => {
    if (!number) return null;
    const cleanNumber = number.replace(/\D/g, '');
    return (cleanNumber.length >= 10) ? `https://wa.me/55${cleanNumber}` : null;
  };
  const waLink = getWhatsAppLink(booking.whatsapp);

  return (
    <div className={`bg-white rounded-xl p-0 shadow-sm hover:shadow-lg transition-all duration-300 border ${status.border} relative overflow-hidden group`}>
      {/* Barra lateral colorida de status */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${status.color.split(' ')[0].replace('bg-', 'bg-opacity-100 bg-')}`}></div>

      <div className="p-4 pl-6">
        {/* --- CABEÇALHO CORRIGIDO --- */}
        <div className="flex justify-between items-start mb-3 gap-2">
          {/* Lado Esquerdo: Foto + Textos (Flexível com min-w-0 para truncar) */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full bg-secondary-100 overflow-hidden border border-secondary-100 flex-shrink-0">
              {booking.clientPhoto ? (
                <img src={booking.clientPhoto} alt={booking.dogName} className="w-full h-full object-cover" />
              ) : (
                <Dog className="w-full h-full p-2 text-secondary-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-secondary-900 text-lg leading-tight truncate" title={booking.dogName}>
                {booking.dogName}
              </h3>
              <p className="text-xs text-secondary-500 flex items-center gap-1 mt-0.5 truncate">
                <User size={12} className="flex-shrink-0" />
                <span className="truncate">{booking.ownerName}</span>
              </p>
            </div>
          </div>

          {/* Lado Direito: Badge (Fixo, não encolhe) */}
          <span className={`flex-shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${status.color}`}>
            {status.label}
          </span>
        </div>
        {/* --------------------------- */}

        {/* Datas */}
        <div className="flex items-center justify-between bg-secondary-50 rounded-lg p-2 mb-3 border border-secondary-100 text-xs">
          <div className="text-center">
            <span className="block text-secondary-400 font-bold">ENTRADA</span>
            <span className="block font-bold text-secondary-700 text-sm">{formatDateShort(booking.checkIn)}</span>
            <span className="text-[10px] text-secondary-400">{new Date(booking.checkIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex-1 flex justify-center px-2 text-secondary-300"><Clock size={14} /></div>
          <div className="text-center">
            <span className="block text-secondary-400 font-bold">SAÍDA</span>
            <span className="block font-bold text-secondary-700 text-sm">{formatDateShort(booking.checkOut)}</span>
            <span className="text-[10px] text-secondary-400">{new Date(booking.checkOut).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Comportamento e Prejuízo */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1 bg-secondary-50 px-2 py-1 rounded">
            <span className="text-[10px] text-secondary-500">Comp:</span>
            <FaceRating rating={booking.dogBehaviorRating || 3} readonly size={14} />
          </div>
          {booking.damageValue > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-error bg-red-50 px-2 py-1 rounded font-bold border border-red-100">
              <AlertTriangle size={10} /> - R$ {booking.damageValue}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-end justify-between border-t pt-2 border-secondary-100">
          <div className="min-w-0 pr-2">
            <span className="text-xl font-bold text-primary-600 truncate block">{formatCurrency(totalNetValue)}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="p-1.5 text-success hover:bg-green-50 rounded-lg transition" title="Whatsapp">
                <MessageCircle size={18} />
              </a>
            )}
            <button onClick={onEdit} className="p-1.5 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition" title="Editar">
              <Edit size={18} />
            </button>
            <button onClick={onDelete} className="p-1.5 text-secondary-400 hover:text-error hover:bg-red-50 rounded-lg transition" title="Excluir">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}