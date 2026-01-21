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