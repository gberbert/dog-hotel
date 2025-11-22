import React, { useState } from 'react';
import { PieChart, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function FinancialPanel({ bookings }) {
  const [view, setView] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const years = [2023, 2024, 2025, 2026];

  // Helpers internos para filtrar os bookings recebidos via props
  const getBookingsByMonth = (month, year) => {
    return bookings.filter(b => {
      if (!b.checkIn) return false;
      const d = new Date(b.checkIn);
      return d.getMonth() === month && d.getFullYear() === year;
    }).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  };

  const calculateMonthlyNetTotal = (month, year) => {
    return getBookingsByMonth(month, year).reduce((acc, curr) => {
      const revenue = parseFloat(curr.totalValue) || 0;
      const damage = parseFloat(curr.damageValue) || 0;
      return acc + (revenue - damage);
    }, 0);
  };

  // Preparação de dados anuais
  const annualData = monthNames.map((month, idx) => {
    const netTotal = calculateMonthlyNetTotal(idx, selectedYear);
    const count = getBookingsByMonth(idx, selectedYear).length;
    return { month, idx, netTotal, count };
  });

  const annualNetTotal = annualData.reduce((acc, curr) => acc + curr.netTotal, 0);
  const annualBookingsCount = annualData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 min-h-[500px] animate-fade-in">
        {/* Header do Painel */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <PieChart className="text-[#0000FF]"/> Painel Financeiro
          </h2>
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
            <button onClick={() => setView('monthly')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition ${view === 'monthly' ? 'bg-white shadow text-[#0000FF]' : 'text-gray-600'}`}>Mensal</button>
            <button onClick={() => setView('annual')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition ${view === 'annual' ? 'bg-white shadow text-[#0000FF]' : 'text-gray-600'}`}>Anual</button>
          </div>
        </div>

        {view === 'monthly' ? (
          <div className="space-y-6">
            {/* Filtros Mensais */}
            <div className="flex flex-wrap gap-4 items-center bg-[#0000FF]/5 p-4 rounded-xl border border-[#0000FF]/10">
              <div className="flex items-center gap-2">
                  <label className="font-bold text-[#0000FF]">Ano:</label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0000FF]">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
              </div>
              <div className="flex items-center gap-2">
                  <label className="font-bold text-[#0000FF]">Mês:</label>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0000FF]">
                      {monthNames.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                  </select>
              </div>
            </div>

            {/* Card de Lucro */}
            <div className="bg-gradient-to-r from-[#00AA00] to-[#00FF00] rounded-2xl p-6 text-white shadow-lg">
              <div className="flex justify-between items-center">
                <div>
                    <p className="text-green-100 text-sm font-medium uppercase tracking-wider">Lucro Líquido (Valor Real) - {monthNames[selectedMonth]}/{selectedYear}</p>
                    <h3 className="text-4xl font-bold mt-2">{formatCurrency(calculateMonthlyNetTotal(selectedMonth, selectedYear))}</h3>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full"><DollarSign size={32} className="text-white" /></div>
              </div>
            </div>

            {/* Tabela Detalhada */}
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="p-3 font-semibold text-gray-700">Data</th>
                        <th className="p-3 font-semibold text-gray-700">Cliente</th>
                        <th className="p-3 font-semibold text-gray-700 text-right">Bruto</th>
                        <th className="p-3 font-semibold text-[#FF0000] text-right">Prejuízos</th>
                        <th className="p-3 font-semibold text-[#00AA00] text-right">Valor Real</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                  {getBookingsByMonth(selectedMonth, selectedYear).length > 0 ? ( 
                      getBookingsByMonth(selectedMonth, selectedYear).map(booking => { 
                          const damage = parseFloat(booking.damageValue) || 0; 
                          const realValue = (parseFloat(booking.totalValue) || 0) - damage; 
                          return ( 
                            <tr key={booking.id} className="hover:bg-gray-50">
                                <td className="p-3 text-gray-800">{new Date(booking.checkIn).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3">
                                    <div className="font-medium text-gray-900">{booking.dogName}</div>
                                    <div className="text-gray-600 text-xs">{booking.ownerName}</div>
                                </td>
                                <td className="p-3 text-right text-gray-700">R$ {booking.totalValue}</td>
                                <td className="p-3 text-right text-[#FF0000] font-medium">{damage > 0 ? `- R$ ${damage}` : '-'}</td>
                                <td className="p-3 text-right font-bold text-[#00AA00]">{formatCurrency(realValue)}</td>
                            </tr> 
                        )}) 
                  ) : ( 
                    <tr><td colSpan="5" className="p-8 text-center text-gray-500 italic">Nenhum faturamento registrado neste período.</td></tr> 
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filtros Anuais */}
            <div className="flex items-center gap-2 bg-[#0000FF]/5 p-4 rounded-xl border border-[#0000FF]/10 w-fit">
                <label className="font-bold text-[#0000FF]">Selecione o Ano:</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0000FF]">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Tabela Anual */}
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-100 border-b">
                    <tr>
                        <th className="p-4 font-bold text-gray-800">Mês</th>
                        <th className="p-4 font-bold text-gray-800 text-center">Hospedagens</th>
                        <th className="p-4 font-bold text-gray-800 text-right">Lucro Líquido (Real)</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                  {annualData.map(({ month, idx, netTotal, count }) => (
                    <tr key={month} className="hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-800">{month}</td>
                      <td className="p-4 text-center text-gray-600">
                          {count > 0 ? <span className="bg-[#0000FF]/10 text-[#0000FF] px-2 py-1 rounded-full text-xs font-bold">{count}</span> : '-'}
                      </td>
                      <td className={`p-4 text-right font-bold ${netTotal > 0 ? 'text-[#00AA00]' : 'text-gray-500'}`}>
                        {formatCurrency(netTotal)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-200 border-t-2 border-gray-400 font-extrabold text-sm">
                    <td className="p-4">TOTAL ANUAL ({selectedYear})</td>
                    <td className="p-4 text-center text-gray-800">
                        <span className="bg-[#0000FF] text-white px-2 py-1 rounded-full text-xs">{annualBookingsCount}</span>
                    </td>
                    <td className={`p-4 text-right ${annualNetTotal > 0 ? 'text-[#00AA00]' : 'text-gray-500'}`}>
                        {formatCurrency(annualNetTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}