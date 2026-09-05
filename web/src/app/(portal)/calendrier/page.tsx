import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ETAT_COLOR } from "@/lib/format";

const MOIS_LONG = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default async function CalendrierPage() {
  const [creneaux, echeances] = await Promise.all([
    prisma.creneau.findMany(),
    prisma.echeance.findMany({ orderBy: { date: "asc" } }),
  ]);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7; // 0 = lundi

  const echeancesByDay = new Map<number, string>();
  for (const e of echeances) {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) echeancesByDay.set(d.getDate(), e.color);
  }

  const cells: { n: number | null; dots: string[] }[] = Array.from({ length: startWeekday }, () => ({ n: null, dots: [] }));
  for (let d = 1; d <= daysInMonth; d++) {
    const weekday = (startWeekday + d - 1) % 7;
    const dots = new Set<string>();
    for (const c of creneaux) if (c.jour === weekday) dots.add(ETAT_COLOR[c.etat]);
    const echeanceColor = echeancesByDay.get(d);
    if (echeanceColor) dots.add(echeanceColor);
    cells.push({ n: d, dots: Array.from(dots).slice(0, 3) });
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))" }}>
      <Card>
        <div className="flex justify-between items-center mb-3.5">
          <h2 className="font-display text-[19px] tracking-[0.06em]">
            {MOIS_LONG[month]} {year}
          </h2>
          <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
            Séances · échéances
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-[11px] uppercase tracking-[0.08em] mb-1.5 text-center" style={{ color: "#61789B" }}>
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c, i) => {
            const isToday = c.n === today.getDate();
            return (
              <div
                key={i}
                className="rounded-[9px] p-1.5 flex flex-col justify-between"
                style={{
                  aspectRatio: "1",
                  border: `1px solid ${isToday ? "#24C8FF" : "var(--border)"}`,
                  background: isToday ? "rgba(30,123,255,0.22)" : c.n ? "rgba(255,255,255,0.03)" : "transparent",
                }}
              >
                {c.n && (
                  <>
                    <span className="text-xs font-semibold" style={{ color: isToday ? "var(--ink)" : "var(--ink-body)" }}>
                      {c.n}
                    </span>
                    <div className="flex gap-1">
                      {c.dots.map((color, j) => (
                        <span key={j} className="w-[5px] h-[5px] rounded-full" style={{ background: color }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <SectionTitle>Échéances de la saison</SectionTitle>
        <div className="flex flex-col gap-2.5">
          {echeances.map((e) => {
            const d = new Date(e.date);
            return (
              <div key={e.id} className="flex gap-3.5 items-center rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${e.color}` }}>
                <div className="text-center" style={{ minWidth: 46 }}>
                  <div className="font-display text-2xl leading-none">{d.getDate()}</div>
                  <div className="text-[11px] uppercase" style={{ color: "var(--ink-secondary)" }}>
                    {MOIS_LONG[d.getMonth()].slice(0, 4)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{e.titre}</div>
                  <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                    {e.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
