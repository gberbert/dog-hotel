const getCapacityInfoForDate = (dateOrStr, defaultCapacity, overrides = []) => {
  if (!dateOrStr) return { capacity: defaultCapacity, reason: null };
  const d = new Date(dateOrStr);
  const targetTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  for (const block of overrides) {
    if (!block.startDate || !block.endDate) continue;
    
    const [sYear, sMonth, sDay] = block.startDate.split('-');
    const start = new Date(sYear, sMonth - 1, sDay);
    
    const [eYear, eMonth, eDay] = block.endDate.split('-');
    const end = new Date(eYear, eMonth - 1, eDay);
    
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

const overrides = [
  { startDate: "2026-07-12", endDate: "2026-07-18", capacity: 0, reason: "Teste" },
  { startDate: "2026-07-10", endDate: "2026-07-10", capacity: 3, reason: "Teste 2" }
];

console.log("Dia 9:", getCapacityInfoForDate(new Date(2026, 6, 9), 6, overrides));
console.log("Dia 10:", getCapacityInfoForDate(new Date(2026, 6, 10), 6, overrides));
console.log("Dia 11:", getCapacityInfoForDate(new Date(2026, 6, 11), 6, overrides));
console.log("Dia 12:", getCapacityInfoForDate(new Date(2026, 6, 12), 6, overrides));
