import React, { useState } from 'react';
import { PieChart, DollarSign, ChevronDown, ChevronUp, Calendar, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function FinancialPanel({ bookings }) {
  const [view, setView] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  // Abreviação para mobile
  const shortMonthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
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
    return { month, shortMonth: shortMonthNames[idx], idx, netTotal, count };
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
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto h-10">
            <button onClick={() => setView('monthly')} className={`flex-1 md:flex-none px-6 rounded-md text-sm font-medium transition flex items-center justify-center ${view === 'monthly' ? 'bg-white shadow text-[#0000FF]' : 'text-gray-600'}`}>Mensal</button>
            <button onClick={() => setView('annual')} className={`flex-1 md:flex-none px-6 rounded-md text-sm font-medium transition flex items-center justify-center ${view === 'annual' ? 'bg-white shadow text-[#0000FF]' : 'text-gray-600'}`}>Anual</button>
          </div>
        </div>

        {view === 'monthly' ? (
          <div className="space-y-6">
            {/* Filtros Mensais */}
            <div className="flex flex-wrap gap-4 items-center bg-[#0000FF]/5 p-4 rounded-xl border border-[#0000FF]/10">
              <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                  <label className="font-bold text-[#0000FF] text-sm">Ano:</label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0000FF] text-sm">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                  <label className="font-bold text-[#0000FF] text-sm">Mês:</label>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0000FF] text-sm">
                      {monthNames.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                  </select>
              </div>
            </div>

            {/* Card de Lucro */}
            <div className="bg-gradient-to-r from-[#00AA00] to-[#00FF00] rounded-2xl p-6 text-white shadow-lg">
              <div className="flex justify-between items-center">
                <div>
                    <p className="text-green-100 text-xs font-medium uppercase tracking-wider">Lucro Líquido (Real)</p>
                    <p className="text-white/80 text-xs mb-1">{monthNames[selectedMonth]}/{selectedYear}</p>
                    <h3 className="text-3xl md:text-4xl font-bold tracking-tight">{formatCurrency(calculateMonthlyNetTotal(selectedMonth, selectedYear))}</h3>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full"><DollarSign size={28} className="text-white" /></div>
              </div>
            </div>

            {/* Tabela Detalhada */}
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-3 font-semibold text-gray-700">Data</th>
                            <th className="p-3 font-semibold text-gray-700">Cliente</th>
                            <th className="p-3 font-semibold text-gray-700 text-right">Bruto</th>
                            <th className="p-3 font-semibold text-[#FF0000] text-right">Prej.</th>
                            <th className="p-3 font-semibold text-[#00AA00] text-right">Líquido</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                      {getBookingsByMonth(selectedMonth, selectedYear).length > 0 ? ( 
                          getBookingsByMonth(selectedMonth, selectedYear).map(booking => { 
                              const damage = parseFloat(booking.damageValue) || 0; 
                              const realValue = (parseFloat(booking.totalValue) || 0) - damage; 
                              return ( 
                                <tr key={booking.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-800">{new Date(booking.checkIn).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</td>
                                    <td className="p-3">
                                        <div className="font-medium text-gray-900 truncate max-w-[100px] md:max-w-none">{booking.dogName}</div>
                                    </td>
                                    <td className="p-3 text-right text-gray-700">R$ {booking.totalValue}</td>
                                    <td className="p-3 text-right text-[#FF0000] font-medium">{damage > 0 ? `- R$ ${damage}` : '-'}</td>
                                    <td className="p-3 text-right font-bold text-[#00AA00]">{formatCurrency(realValue)}</td>
                                </tr> 
                            )}) 
                      ) : ( 
                        <tr><td colSpan="5" className="p-8 text-center text-gray-500 italic">Sem faturamento neste período.</td></tr> 
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filtros Anuais */}
            <div className="flex items-center gap-2 bg-[#0000FF]/5 p-3 rounded-xl border border-[#0000FF]/10 w-full md:w-fit justify-center md:justify-start">
                <label className="font-bold text-[#0000FF] text-sm">Ano:</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="p-2 pr-8 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0000FF] text-sm font-bold">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Tabela Anual Otimizada para Mobile */}
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left table-fixed"> {/* table-fixed é crucial para não estourar */}
                <thead className="bg-gray-50 border-b text-xs md:text-sm uppercase tracking-wider">
                    <tr>
                        <th className="w-[25%] p-3 pl-4 font-bold text-gray-600">Mês</th>
                        <th className="w-[20%] p-3 text-center font-bold text-gray-600" title="Quantidade de Hospedagens">Qtd.</th>
                        <th className="w-[55%] p-3 pr-4 text-right font-bold text-gray-600">Lucro</th>
                    </tr>
                </thead>
                <tbody className="divide-y text-sm md:text-base">
                  {annualData.map(({ month, shortMonth, netTotal, count }) => (
                    <tr key={month} className="hover:bg-gray-50 transition">
                      <td className="p-3 pl-4 font-medium text-gray-800 truncate">
                          {/* Mostra abreviação no mobile e nome completo no desktop */}
                          <span className="md:hidden">{shortMonth}</span>
                          <span className="hidden md:inline">{month}</span>
                      </td>
                      <td className="p-3 text-center">
                          {count > 0 ? (
                             <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px]">
                                {count}
                             </span>
                          ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className={`p-3 pr-4 text-right font-bold truncate ${netTotal > 0 ? 'text-[#00AA00]' : 'text-gray-400'}`}>
                        {netTotal > 0 ? formatCurrency(netTotal) : 'R$ 0,00'}
                      </td>
                    </tr>
                  ))}
                  {/* TOTALIZADOR */}
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td className="p-3 pl-4 font-extrabold text-gray-800 text-xs md:text-sm">TOTAL</td>
                    <td className="p-3 text-center font-bold text-gray-800 text-xs md:text-sm">
                        {annualBookingsCount}
                    </td>
                    <td className={`p-3 pr-4 text-right font-extrabold text-sm md:text-base ${annualNetTotal > 0 ? 'text-[#00AA00]' : 'text-gray-500'}`}>
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