
import { generateMedicationICS } from './src/utils/calendarGenerator.js';

const mockBooking = {
    id: 'booking_123',
    dogName: 'Rex',
    checkIn: '2025-12-20T10:00:00',
    checkOut: '2025-12-25T18:00:00',
    medications: [
        { name: 'Remédio A', dosage: '1 cp', time: '08:00' },
        { name: 'Remédio B', dosage: '1/2 cp', time: '14:00' },
        { name: 'Remédio C', dosage: '2 gtas', time: '20:00' }
    ]
};

console.log("--- START ICS CONTENT ---");
const content = generateMedicationICS(mockBooking);
console.log(content);
console.log("--- END ICS CONTENT ---");

// Validação simples
if (content) {
    const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length;
    console.log(`\nNúmero de Eventos Gerados: ${eventCount}`);
    if (eventCount === 3) {
        console.log("SUCESSO: Gerou 3 eventos distintos.");
    } else {
        console.log("FALHA: Número incorreto de eventos.");
    }
} else {
    console.log("FALHA: Conteúdo vazio.");
}
