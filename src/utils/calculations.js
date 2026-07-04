export const calculateTotalDays = (checkInStr, checkOutStr) => {
  if (!checkInStr || !checkOutStr) return 0;

  const start = new Date(checkInStr);
  const end = new Date(checkOutStr);

  // Zera as horas para calcular apenas dias cheios (noites)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const diffTime = endDay.getTime() - startDay.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Garante no mínimo 1 diária
  return Math.max(1, diffDays);
};

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

export const formatDateBR = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const getBookingStatus = (checkIn, checkOut) => {
  const now = new Date();
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (now < start) return { label: 'Agendado', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' };
  if (now >= start && now <= end) return { label: 'Hospedado', color: 'bg-green-100 text-green-700 animate-pulse', border: 'border-green-200' };
  return { label: 'Finalizado', color: 'bg-gray-100 text-gray-500', border: 'border-gray-200' };
};

export const isVaccineExpired = (dateStr) => {
  if (!dateStr) return false;
  const vaccineDate = new Date(dateStr);
  // Simples sanity check para datas inválidas
  if (isNaN(vaccineDate.getTime())) return false;

  const today = new Date();
  // Zera hora de hoje
  today.setHours(0, 0, 0, 0);

  const expirationDate = new Date(vaccineDate);
  expirationDate.setFullYear(vaccineDate.getFullYear() + 1);
  // Zera hora da expiração para comparar dia
  expirationDate.setHours(0, 0, 0, 0);

  return today > expirationDate;
};

// Nova função para calcular vagas flexíveis / bloqueios
export const getCapacityInfoForDate = (dateOrStr, defaultCapacity, overrides = []) => {
  if (!dateOrStr) return { capacity: defaultCapacity, reason: null };
  const d = new Date(dateOrStr);
  const targetTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  for (const block of overrides) {
    if (!block.startDate || !block.endDate) continue;
    
    // Corrige offset de timezone: string 'YYYY-MM-DD' é interpretada como UTC pelo new Date().
    // Isso causava recuo de 1 dia em timezones negativos (ex: Brasil).
    const [sYear, sMonth, sDay] = block.startDate.split('-');
    const start = new Date(sYear, sMonth - 1, sDay);
    
    const [eYear, eMonth, eDay] = block.endDate.split('-');
    const end = new Date(eYear, eMonth - 1, eDay);
    
    // Zera horas
    const startT = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endT = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

    if (targetTime >= startT && targetTime <= endT) {
      return { 
        capacity: Number(block.capacity) || 0, 
        reason: block.reason || 'Bloqueado'
      };
    }
  }

  return { capacity: defaultCapacity, reason: null };
};