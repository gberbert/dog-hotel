import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { getCapacityInfoForDate } from '../../utils/calculations.js';

export default function DateRangePicker({ 
    checkInDate, 
    checkOutDate, 
    onChange, 
    bookings = [], 
    maxCapacity = 6, 
    capacityOverrides = [] 
}) {
    // Controla o mês atualmente exibido (padrão: hoje, ou mês do checkInDate)
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (checkInDate) {
            const [y, m, d] = checkInDate.split('-');
            return new Date(y, m - 1, 1);
        }
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    const [hoverDate, setHoverDate] = useState(null);

    // Helpers
    const isSameDay = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const toISODate = (d) => {
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
    };

    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

    // Lógica para desenhar o calendário
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    
    const daysArray = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        daysArray.push(null); // Espaços vazios
    }
    for (let i = 1; i <= daysInMonth; i++) {
        daysArray.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    const parsedCheckIn = checkInDate ? new Date(checkInDate + 'T00:00:00') : null;
    const parsedCheckOut = checkOutDate ? new Date(checkOutDate + 'T00:00:00') : null;

    // Verifica disponibilidade do dia
    const getDayStatus = (d) => {
        if (!d) return null;
        if (d < today) return 'past';

        const capInfo = getCapacityInfoForDate(d, maxCapacity, capacityOverrides);
        if (capInfo.capacity === 0) return 'blocked';

        const dStart = new Date(d).setHours(0,0,0,0);
        const dEnd = new Date(d).setHours(23,59,59,999);
        const bookingsOnDay = bookings.filter(b => {
            if (!b.checkIn || !b.checkOut) return false;
            return (new Date(b.checkIn).getTime() <= dEnd && new Date(b.checkOut).getTime() >= dStart);
        }).length;

        if (bookingsOnDay >= capInfo.capacity) return 'full';
        return 'available';
    };

    const handleDateClick = (d) => {
        const status = getDayStatus(d);
        if (status === 'past' || status === 'blocked' || status === 'full') return; // Bloqueia clique

        // Se não tem checkIn, ou já tem checkIn e checkOut (vai recomeçar)
        if (!parsedCheckIn || (parsedCheckIn && parsedCheckOut)) {
            onChange(toISODate(d), '');
        } 
        // Se tem checkIn mas não tem checkOut
        else if (parsedCheckIn && !parsedCheckOut) {
            // Se clicou num dia anterior ao checkIn, o novo dia vira o checkIn
            if (d < parsedCheckIn) {
                onChange(toISODate(d), '');
            } else {
                // Se clicou no mesmo dia do checkIn ou depois, é o checkOut!
                // MAS, precisamos verificar se há dias bloqueados no meio!
                let temp = new Date(parsedCheckIn);
                let invalidRange = false;
                while (temp <= d) {
                    const st = getDayStatus(temp);
                    if (st === 'blocked' || st === 'full') {
                        invalidRange = true;
                        break;
                    }
                    temp.setDate(temp.getDate() + 1);
                }

                if (invalidRange) {
                    alert("O período selecionado inclui dias bloqueados ou lotados. Por favor, escolha outro intervalo.");
                    onChange(toISODate(d), ''); // O novo dia vira o checkIn
                } else {
                    // Seleção válida
                    onChange(toISODate(parsedCheckIn), toISODate(d));
                }
            }
        }
    };

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    return (
        <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden select-none">
            {/* Header */}
            <div className="flex justify-between items-center p-3 bg-secondary-50 border-b border-secondary-200">
                <button type="button" onClick={prevMonth} className="p-1 hover:bg-secondary-200 rounded-full transition"><ChevronLeft size={20}/></button>
                <div className="font-bold text-secondary-800">
                    {monthNames[currentMonth.getMonth()]} de {currentMonth.getFullYear()}
                </div>
                <button type="button" onClick={nextMonth} className="p-1 hover:bg-secondary-200 rounded-full transition"><ChevronRight size={20}/></button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 p-2 text-center text-xs font-bold text-secondary-400">
                {weekDays.map(wd => <div key={wd}>{wd}</div>)}
            </div>

            {/* Grid do mês */}
            <div className="grid grid-cols-7 gap-1 p-2">
                {daysArray.map((d, i) => {
                    if (!d) return <div key={i} className="aspect-square" />; // vazio

                    const status = getDayStatus(d);
                    const isPast = status === 'past';
                    const isBlocked = status === 'blocked' || status === 'full';
                    const isAvailable = status === 'available';

                    const isCheckIn = isSameDay(d, parsedCheckIn);
                    const isCheckOut = isSameDay(d, parsedCheckOut);
                    
                    // Lógica para Highlight
                    let isBetween = false;
                    let isHoverBetween = false;
                    
                    if (parsedCheckIn && parsedCheckOut) {
                        isBetween = d > parsedCheckIn && d < parsedCheckOut;
                    } else if (parsedCheckIn && !parsedCheckOut && hoverDate && hoverDate > parsedCheckIn) {
                        isHoverBetween = d > parsedCheckIn && d <= hoverDate;
                    }

                    // Determina a aparência da célula
                    let bgClass = 'bg-transparent';
                    let textClass = 'text-secondary-700 hover:bg-secondary-100 cursor-pointer rounded-lg';
                    let title = '';

                    if (isPast) {
                        textClass = 'text-secondary-300 cursor-not-allowed';
                    } else if (isBlocked) {
                        bgClass = 'bg-red-50';
                        textClass = 'text-red-300 line-through cursor-not-allowed rounded-lg';
                        title = status === 'full' ? 'Lotação Máxima' : 'Data Bloqueada';
                    } else if (isCheckIn || isCheckOut) {
                        bgClass = 'bg-primary-600';
                        textClass = 'text-white font-bold rounded-lg shadow-sm';
                        // Se for checkin e não tiver checkout, e estiver arrastando
                        if (isCheckIn && !parsedCheckOut && hoverDate > parsedCheckIn) {
                            bgClass = 'bg-primary-600 rounded-l-lg rounded-r-none';
                        }
                    } else if (isBetween) {
                        bgClass = 'bg-primary-100';
                        textClass = 'text-primary-800 rounded-none'; // Quadrado para juntar
                    } else if (isHoverBetween && isAvailable) {
                        bgClass = 'bg-primary-50 border-y border-primary-200';
                        textClass = 'text-primary-700 rounded-none';
                    }

                    return (
                        <div 
                            key={i} 
                            onClick={() => handleDateClick(d)}
                            onMouseEnter={() => { if (!isPast && !isBlocked) setHoverDate(d); }}
                            onMouseLeave={() => setHoverDate(null)}
                            title={title}
                            className={`aspect-square flex items-center justify-center text-sm transition-colors ${bgClass} ${textClass}`}
                        >
                            {d.getDate()}
                        </div>
                    );
                })}
            </div>
            
            {/* Legenda */}
            <div className="flex justify-center gap-4 p-3 bg-secondary-50 text-xs text-secondary-500 border-t border-secondary-200">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div> Indisponível</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-primary-600 rounded"></div> Selecionado</span>
            </div>
        </div>
    );
}
