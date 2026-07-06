import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, MessageSquare, Loader2, Info } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, appId } from '../utils/firebase';
import { getCapacityInfoForDate, calculateTotalDays, formatCurrency } from '../utils/calculations.js';
import DateRangePicker from './shared/DateRangePicker.jsx';

export default function ClientBookingModal({ onClose, user, clientDatabase, bookings = [], maxCapacity = 6, capacityOverrides = [], defaultRate = 80 }) {
  const [loading, setLoading] = useState(false);
  
  // Buscar os dados completos do usuário no banco local pelo email (o ID do Firestore não é igual ao UID do Auth)
  const currentClient = clientDatabase?.find(c => c.ownerEmail === user?.email);

  // Validação: Perfil incompleto?
  const missingFields = [];
  if (currentClient) {
    if (!currentClient.dogName) missingFields.push('Nome do Pet');
    if (!currentClient.birthYear) missingFields.push('Ano de Nascimento');
    if (!currentClient.dogSize) missingFields.push('Porte do Pet');
    if (!currentClient.dogBreed) missingFields.push('Raça do Pet');
    if (!currentClient.history) missingFields.push('Comportamento e Histórico');
    if (!currentClient.lastAntiRabica || !currentClient.lastMultipla) missingFields.push('Datas de Vacinação (Anti-rábica e Múltipla)');
    if (!currentClient.vaccineDocs || currentClient.vaccineDocs.length === 0) missingFields.push('Foto da Carteira de Vacinação');
    if (!currentClient.ownerName) missingFields.push('Nome do Tutor');
    if (!currentClient.whatsapp) missingFields.push('Telefone/WhatsApp');
  } else {
    missingFields.push('Ficha de Cadastro');
  }

  const isProfileComplete = currentClient && missingFields.length === 0;

  const [formData, setFormData] = useState({
    checkInDate: '',
    checkInTime: '08:00',
    checkOutDate: '',
    checkOutTime: '18:00',
    notes: ''
  });

  // --- CHECAGEM DINÂMICA PARA DESATIVAR O BOTÃO ---
  let isButtonDisabled = false;
  let dynamicError = '';

  if (formData.checkInDate && formData.checkOutDate && formData.checkInDate <= formData.checkOutDate) {
    const startD = new Date(formData.checkInDate + 'T00:00:00');
    const endD = new Date(formData.checkOutDate + 'T00:00:00');
    let currentDate = new Date(startD);
    
    while (currentDate <= endD) {
      const capInfo = getCapacityInfoForDate(currentDate, maxCapacity, capacityOverrides);
      
      if (capInfo.capacity === 0) {
        isButtonDisabled = true;
        dynamicError = `A data ${currentDate.toLocaleDateString('pt-BR')} está bloqueada.`;
        break;
      }

      const dStart = new Date(currentDate).setHours(0,0,0,0);
      const dEnd = new Date(currentDate).setHours(23,59,59,999);
      const bookingsOnDay = bookings.filter(b => {
        if (!b.checkIn || !b.checkOut) return false;
        return (new Date(b.checkIn).getTime() <= dEnd && new Date(b.checkOut).getTime() >= dStart);
      }).length;

      if (bookingsOnDay >= capInfo.capacity) {
        isButtonDisabled = true;
        dynamicError = `A data ${currentDate.toLocaleDateString('pt-BR')} atingiu a lotação máxima.`;
        break;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const totalDays = (formData.checkInDate && formData.checkOutDate) ? calculateTotalDays(formData.checkInDate, formData.checkOutDate) : 0;
  const totalCost = totalDays * defaultRate;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isProfileComplete) return;

    if (formData.checkInDate > formData.checkOutDate) {
      alert("A data de entrada não pode ser posterior à data de saída.");
      return;
    }

    // --- VALIDAÇÃO DE CAPACIDADE E BLOQUEIOS ---
    const startD = new Date(formData.checkInDate + 'T00:00:00');
    const endD = new Date(formData.checkOutDate + 'T00:00:00');
    let currentDate = new Date(startD);
    
    let hasError = false;
    let errorMessage = '';

    while (currentDate <= endD) {
      const capInfo = getCapacityInfoForDate(currentDate, maxCapacity, capacityOverrides);
      
      if (capInfo.capacity === 0) {
        hasError = true;
        errorMessage = `Hospedagem indisponível. A data ${currentDate.toLocaleDateString('pt-BR')} está bloqueada.`;
        break;
      }

      // Calcula reservas daquele dia
      const dStart = new Date(currentDate).setHours(0,0,0,0);
      const dEnd = new Date(currentDate).setHours(23,59,59,999);
      const bookingsOnDay = bookings.filter(b => {
        if (!b.checkIn || !b.checkOut) return false;
        return (new Date(b.checkIn).getTime() <= dEnd && new Date(b.checkOut).getTime() >= dStart);
      }).length;

      if (bookingsOnDay >= capInfo.capacity) {
        hasError = true;
        errorMessage = `A data ${currentDate.toLocaleDateString('pt-BR')} atingiu a lotação máxima.`;
        break;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (hasError) {
      alert(errorMessage);
      return;
    }

    setLoading(true);
    try {
      // Monta os ISO strings
      const checkInISO = `${formData.checkInDate}T${formData.checkInTime}:00`;
      const checkOutISO = `${formData.checkOutDate}T${formData.checkOutTime}:00`;

      const requestPayload = {
        clientId: currentClient.id,
        dogName: currentClient.dogName,
        ownerName: currentClient.ownerName,
        checkIn: checkInISO,
        checkOut: checkOutISO,
        notes: formData.notes,
        dailyRate: defaultRate, // Passa a diária que estava vigente
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'booking_requests'), requestPayload);
      
      alert("Sua solicitação de hospedagem foi enviada com sucesso! O hotel analisará a disponibilidade.");
      onClose();
    } catch (error) {
      console.error("Erro ao enviar solicitação", error);
      alert("Houve um erro ao enviar sua solicitação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-primary-700 text-white p-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold">Solicitar Hospedagem</h2>
          <button onClick={onClose} className="p-1 hover:bg-primary-600 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!isProfileComplete ? (
            <div className="text-center py-6">
              <div className="bg-yellow-100 text-yellow-800 p-4 rounded-xl inline-block mb-4">
                <Info size={40} className="mx-auto mb-2" />
                <h3 className="font-bold text-lg">Cadastro Incompleto</h3>
              </div>
              <p className="text-secondary-600 mb-4">
                Para solicitar uma hospedagem, você precisa preencher o <strong>Meu Cadastro</strong> primeiro. Faltam os seguintes dados obrigatórios:
              </p>
              <ul className="text-left bg-secondary-50 border border-secondary-200 p-4 rounded-lg text-secondary-700 text-sm mb-6 space-y-2">
                {missingFields.map((field, i) => (
                  <li key={i} className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    {field}
                  </li>
                ))}
              </ul>
              <button 
                onClick={onClose}
                className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition"
              >
                Entendi
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200">
                <p className="text-sm text-secondary-600 mb-2">Solicitando vaga para:</p>
                <div className="font-bold text-lg text-primary-700">{currentClient.dogName}</div>
              </div>

              <div className="mb-4">
                <DateRangePicker 
                    checkInDate={formData.checkInDate}
                    checkOutDate={formData.checkOutDate}
                    bookings={bookings}
                    maxCapacity={maxCapacity}
                    capacityOverrides={capacityOverrides}
                    onChange={(inD, outD) => setFormData({...formData, checkInDate: inD, checkOutDate: outD})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-secondary-50 p-4 rounded-xl border border-secondary-200">
                <div>
                  <label className="block text-sm font-bold text-secondary-700 mb-1 flex items-center gap-1"><Clock size={14}/> Chegada</label>
                  <input type="time" required value={formData.checkInTime} onChange={(e) => setFormData({...formData, checkInTime: e.target.value})} className="w-full p-2.5 bg-white border border-secondary-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-secondary-700 mb-1 flex items-center gap-1"><Clock size={14}/> Saída</label>
                  <input type="time" required value={formData.checkOutTime} onChange={(e) => setFormData({...formData, checkOutTime: e.target.value})} className="w-full p-2.5 bg-white border border-secondary-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary-700 mb-1 flex items-center gap-1"><MessageSquare size={14}/> Observações <span className="text-secondary-400 font-normal text-xs">(Opcional)</span></label>
                <textarea 
                  rows="3" 
                  value={formData.notes} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                  className="w-full p-3 bg-secondary-50 border border-secondary-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Algum aviso especial para essa hospedagem?"
                ></textarea>
              </div>

              {dynamicError && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mt-4 text-center font-medium">
                  {dynamicError}
                </div>
              )}

              {totalDays > 0 && !dynamicError && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-green-800">{totalDays} diária{totalDays > 1 ? 's' : ''} x {formatCurrency(defaultRate)}</span>
                    <span className="text-sm text-green-700 font-medium">Estimativa:</span>
                  </div>
                  <div className="text-right text-2xl font-black text-green-900 mt-1">
                    {formatCurrency(totalCost)}
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || isButtonDisabled}
                className="w-full bg-primary-600 text-white font-bold py-3.5 rounded-xl hover:bg-primary-700 transition flex justify-center items-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Enviar Solicitação'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
