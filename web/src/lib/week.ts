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

export function lastOccurrenceOnOrBefore(jour: number, ref: Date = new Date()) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const refJour = (d.getDay() + 6) % 7; // 0 = lundi
  const diff = (refJour - jour + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function weekRangeLabel(offset: number) {
  const dates = weekDates(offset);
  const first = dates[0];
  const last = dates[6];
  return `Semaine du ${first.getDate()} au ${last.getDate()} ${MOIS[last.getMonth()]}`;
}

export function fmtPeriodeLabel(debut: Date, fin: Date) {
  if (debut.getTime() === fin.getTime()) return `${fmtDayLabel(debut)} ${debut.getFullYear()}`;
  const sameMonth = debut.getMonth() === fin.getMonth() && debut.getFullYear() === fin.getFullYear();
  const from = sameMonth ? String(debut.getDate()).padStart(2, "0") : fmtDayLabel(debut);
  return `${from} → ${fmtDayLabel(fin)} ${fin.getFullYear()}`;
}
