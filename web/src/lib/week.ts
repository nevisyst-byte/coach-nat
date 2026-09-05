export function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekDates(offset: number) {
  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function fmtDayLabel(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")} ${MOIS[d.getMonth()]}`;
}

export function weekRangeLabel(offset: number) {
  const dates = weekDates(offset);
  const first = dates[0];
  const last = dates[6];
  return `Semaine du ${first.getDate()} au ${last.getDate()} ${MOIS[last.getMonth()]}`;
}
