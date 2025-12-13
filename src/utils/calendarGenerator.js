export const generateMedicationICS = (booking) => {
    const { dogName, medications, checkIn, checkOut } = booking;
    if (!medications || medications.length === 0) return null;

    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//DogHotel//Medication Schedule//PT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    // Helper to parse time HH:MM
    const parseTime = (timeStr) => {
        if (!timeStr) return { h: 9, m: 0 };
        const [h, m] = timeStr.split(':').map(Number);
        return { h, m };
    };

    // Normalize dates
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    medications.forEach((med, index) => {
        const { h, m } = parseTime(med.time);

        // Define Start Date-Time (Floating Time - Local to device)
        const startObj = new Date(startDate);
        startObj.setHours(h, m, 0, 0);

        // Format: YYYYMMDDTHHMMSS
        const formatFloating = (d) => {
            const pad = n => n.toString().padStart(2, '0');
            return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
        };

        const dtStart = formatFloating(startObj);

        // Define Until Date (End of checkout day)
        const untilObj = new Date(endDate);
        untilObj.setHours(23, 59, 59);
        const dtUntil = formatFloating(untilObj); // Must act as floating if DTSTART is floating

        icsContent.push(
            'BEGIN:VEVENT',
            `UID:med_${booking.id || Date.now()}_${index}_${Math.floor(Math.random() * 10000)}@doghotel`,
            `SUMMARY:💊 ${dogName}: ${med.name}`,
            `DESCRIPTION:Dose: ${med.dosage}\\nHorário: ${med.time}`,
            `DTSTART:${dtStart}`,
            `RRULE:FREQ=DAILY;UNTIL=${dtUntil}`,
            'BEGIN:VALARM',
            'TRIGGER:-PT0M',
            'ACTION:DISPLAY',
            'DESCRIPTION:Hora do Remédio',
            'END:VALARM',
            'END:VEVENT'
        );
    });

    icsContent.push('END:VCALENDAR');

    return icsContent.join('\r\n');
};

export const downloadICS = (booking) => {
    const content = generateMedicationICS(booking);
    if (!content) {
        alert("Não há medicações para gerar alarme.");
        return;
    }

    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Alarme_Remedios_${booking.dogName || 'Dog'}.ics`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};
