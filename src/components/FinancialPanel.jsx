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
        <h2 className="text-2xl font-bold text-secondary-800 flex items-center gap-2">
          <PieChart className="text-primary-600" /> Painel Financeiro
        </h2>
        <div className="flex bg-secondary-100 p-1 rounded-lg w-full md:w-auto h-10">
          <button onClick={() => setView('monthly')} className={`flex-1 md:flex-none px-6 rounded-md text-sm font-medium transition flex items-center justify-center ${view === 'monthly' ? 'bg-white shadow text-primary-600' : 'text-secondary-600'}`}>Mensal</button>
          <button onClick={() => setView('annual')} className={`flex-1 md:flex-none px-6 rounded-md text-sm font-medium transition flex items-center justify-center ${view === 'annual' ? 'bg-white shadow text-primary-600' : 'text-secondary-600'}`}>Anual</button>
        </div>
      </div>

      {view === 'monthly' ? (
        <div className="space-y-6">
          {/* Filtros Mensais */}
          <div className="flex flex-wrap gap-4 items-center bg-primary-50 p-4 rounded-xl border border-primary-100">
            <div className="flex items-center gap-2 flex-1 min-w-[120px]">
              <label className="font-bold text-primary-600 text-sm">Ano:</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[120px]">
              <label className="font-bold text-primary-600 text-sm">Mês:</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                {monthNames.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Card de Lucro */}
          <div className="bg-gradient-to-r from-success to-green-400 rounded-2xl p-6 text-white shadow-lg">
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
                <thead className="bg-secondary-50 border-b">
                  <tr>
                    <th className="p-3 font-semibold text-secondary-700">Data</th>
                    <th className="p-3 font-semibold text-secondary-700">Cliente</th>
                    <th className="p-3 font-semibold text-secondary-700 text-right">Bruto</th>
                    <th className="p-3 font-semibold text-error text-right">Prej.</th>
                    <th className="p-3 font-semibold text-success text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {getBookingsByMonth(selectedMonth, selectedYear).length > 0 ? (
                    getBookingsByMonth(selectedMonth, selectedYear).map(booking => {
                      const damage = parseFloat(booking.damageValue) || 0;
                      const realValue = (parseFloat(booking.totalValue) || 0) - damage;
                      return (
                        <tr key={booking.id} className="hover:bg-secondary-50">
                          <td className="p-3 text-secondary-800">{new Date(booking.checkIn).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                          <td className="p-3">
                            <div className="font-medium text-secondary-900 truncate max-w-[100px] md:max-w-none">{booking.dogName}</div>
                          </td>
                          <td className="p-3 text-right text-secondary-700">R$ {booking.totalValue}</td>
                          <td className="p-3 text-right text-error font-medium">{damage > 0 ? `- R$ ${damage}` : '-'}</td>
                          <td className="p-3 text-right font-bold text-success">{formatCurrency(realValue)}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan="5" className="p-8 text-center text-secondary-500 italic">Sem faturamento neste período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filtros Anuais */}
          <div className="flex items-center gap-2 bg-primary-50 p-3 rounded-xl border border-primary-100 w-full md:w-fit justify-center md:justify-start">
            <label className="font-bold text-primary-600 text-sm">Ano:</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="p-2 pr-8 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Tabela Anual Otimizada para Mobile */}
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left table-fixed"> {/* table-fixed é crucial para não estourar */}
              <thead className="bg-secondary-50 border-b text-xs md:text-sm uppercase tracking-wider">
                <tr>
                  <th className="w-[25%] p-3 pl-4 font-bold text-secondary-600">Mês</th>
                  <th className="w-[20%] p-3 text-center font-bold text-secondary-600" title="Quantidade de Hospedagens">Qtd.</th>
                  <th className="w-[55%] p-3 pr-4 text-right font-bold text-secondary-600">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm md:text-base">
                {annualData.map(({ month, shortMonth, netTotal, count }) => (
                  <tr key={month} className="hover:bg-secondary-50 transition">
                    <td className="p-3 pl-4 font-medium text-secondary-800 truncate">
                      {/* Mostra abreviação no mobile e nome completo no desktop */}
                      <span className="md:hidden">{shortMonth}</span>
                      <span className="hidden md:inline">{month}</span>
                    </td>
                    <td className="p-3 text-center">
                      {count > 0 ? (
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px]">
                          {count}
                        </span>
                      ) : <span className="text-secondary-300">-</span>}
                    </td>
                    <td className={`p-3 pr-4 text-right font-bold truncate ${netTotal > 0 ? 'text-success' : 'text-secondary-400'}`}>
                      {netTotal > 0 ? formatCurrency(netTotal) : 'R$ 0,00'}
                    </td>
                  </tr>
                ))}
                {/* TOTALIZADOR */}
                <tr className="bg-secondary-100 border-t-2 border-secondary-300">
                  <td className="p-3 pl-4 font-extrabold text-secondary-800 text-xs md:text-sm">TOTAL</td>
                  <td className="p-3 text-center font-bold text-secondary-800 text-xs md:text-sm">
                    {annualBookingsCount}
                  </td>
                  <td className={`p-3 pr-4 text-right font-extrabold text-sm md:text-base ${annualNetTotal > 0 ? 'text-success' : 'text-secondary-500'}`}>
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