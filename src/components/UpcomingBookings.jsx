import React from 'react';
import { Calendar, Home } from 'lucide-react';
import BookingCard from './BookingCard';

export default function UpcomingBookings({ bookings, clients, onEdit, onDelete }) {
  // 1. Enriquecer as reservas com dados do cliente (Foto, Comportamento, etc)
  const enrichedBookings = bookings.map(b => {
    const client = clients.find(c => c.id === b.clientId);
    return {
      ...b,
      clientPhoto: client?.photos?.[0],
      clientDogBehaviorRating: client?.dogBehaviorRating
    };
  });

  // 2. Data de hoje (zerando horas para comparação justa)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 3. Filtrar e Ordenar
  const upcomingList = enrichedBookings
    .filter(b => {
      if (!b.checkOut) return false;
      // Mantém se o checkout for hoje ou no futuro (Hospedagens ativas ou futuras)
      const checkOutDate = new Date(b.checkOut);
      return checkOutDate >= today;
    })
    .sort((a, b) => {
      // Ordena pela data de check-in (do mais próximo para o mais distante)
      return new Date(a.checkIn) - new Date(b.checkIn);
    });

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary-100 p-3 rounded-full text-primary-600">
          <Home size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-secondary-800">Próximas Hospedagens</h2>
          <p className="text-secondary-500 text-sm">
            {upcomingList.length} registros encontrados (Em andamento ou Futuros)
          </p>
        </div>
      </div>

      {upcomingList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-secondary-200">
          <div className="flex justify-center mb-4 text-secondary-300">
            <Calendar size={48} />
          </div>
          <h3 className="text-lg font-medium text-secondary-600">Agenda Livre</h3>
          <p className="text-secondary-400">Nenhuma hospedagem prevista para os próximos dias.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingList.map(booking => (
            // CORREÇÃO: Removido 'transform' e 'hover:-translate' que quebravam o modal da foto.
            // Mantido apenas hover:shadow-md que é seguro.
            <div key={booking.id} className="transition-all duration-300 hover:shadow-md rounded-xl">
              <BookingCard 
                booking={booking} 
                onEdit={() => onEdit(booking)} 
                onDelete={() => onDelete(booking.id)} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}