import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ETAT_COLOR } from "@/lib/format";
import { getSession } from "@/lib/auth";
import { SemaineTypeClient } from "@/components/portal/SemaineTypeClient";
import { CalendrierClient } from "@/components/portal/CalendrierClient";
import { EcheancesAdmin } from "@/components/admin/EcheancesAdmin";

type Evt = { label: string; color: string };

const MOIS_LONG = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default async function CalendrierPage() {
  const session = await getSession();
  const [creneaux, groupes, coachs, nageurs, echeances, stages, evenementsSemaine] = await Promise.all([
    prisma.creneau.findMany({ include: { groupe: true, coach: { include: { user: true } }, effectifNageurs: { select: { nageurId: true } } } }),
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
    prisma.coach.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.nageur.findMany({ orderBy: { nom: "asc" } }),
    prisma.echeance.findMany({ orderBy: { date: "asc" } }),
    prisma.stage.findMany({ orderBy: { dateDebut: "asc" } }),
    prisma.evenementSemaine.findMany({ include: { coach: { include: { user: true } } } }),
  ]);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7; // 0 = lundi

  const echeancesByDay = new Map<number, Evt[]>();
  for (const e of echeances) {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const list = echeancesByDay.get(d.getDate()) ?? [];
      list.push({ label: e.titre, color: e.color });
      echeancesByDay.set(d.getDate(), list);
    }
  }

  const cells: { n: number | null; evts: Evt[] }[] = Array.from({ length: startWeekday }, () => ({ n: null, evts: [] }));
  for (let d = 1; d <= daysInMonth; d++) {
    const weekday = (startWeekday + d - 1) % 7;
    const evts: Evt[] = [];
    for (const c of creneaux) if (c.jour === weekday) evts.push({ label: c.groupe.nom, color: ETAT_COLOR[c.etat] });
    evts.push(...(echeancesByDay.get(d) ?? []));
    cells.push({ n: d, evts: evts.slice(0, 3) });
  }

  const vueEnsemble = (
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
                className="rounded-[9px] p-1.5 flex flex-col gap-0.5"
                style={{
                  minHeight: 74,
                  border: `1px solid ${isToday ? "#24C8FF" : "var(--border)"}`,
                  background: isToday ? "rgba(30,123,255,0.22)" : c.n ? "rgba(255,255,255,0.03)" : "transparent",
                }}
              >
                {c.n && (
                  <>
                    <span className="text-xs font-semibold" style={{ color: isToday ? "var(--ink)" : "var(--ink-body)" }}>
                      {c.n}
                    </span>
                    {c.evts.map((e, j) => (
                      <span
                        key={j}
                        className="text-[9px] font-bold leading-tight px-1 py-0.5 rounded whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{ background: "rgba(255,255,255,0.08)", color: e.color }}
                      >
                        {e.label}
                      </span>
                    ))}
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
          {echeances.length === 0 && (
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Aucune échéance enregistrée.
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const prochainesEcheances = echeances
    .filter((e) => e.date.getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime())
    .map((e) => ({ id: e.id, titre: e.titre, detail: e.detail, color: e.color, date: e.date.toISOString(), jour: (new Date(e.date).getDay() + 6) % 7 }));

  const semaineType = (
    <SemaineTypeClient
      creneaux={creneaux}
      groupes={groupes.map((g) => ({ id: g.id, nom: g.nom }))}
      coachs={coachs.map((c) => ({ id: c.id, nom: c.user.name }))}
      nageurs={nageurs.map((n) => ({ id: n.id, nom: n.nom, groupeId: n.groupeId }))}
      evenements={evenementsSemaine.map((e) => ({
        id: e.id,
        jour: e.jour,
        debut: e.debut,
        fin: e.fin,
        categorie: e.categorie,
        titre: e.titre,
        lieu: e.lieu,
        coachId: e.coachId,
        coach: e.coach ? { user: { name: e.coach.user.name } } : null,
      }))}
      prochainesEcheances={prochainesEcheances}
    />
  );

  const vacances = (
    <Card>
      <div className="flex justify-between items-center mb-3.5 gap-3 flex-wrap">
        <div>
          <SectionTitle>Stages de vacances</SectionTitle>
          <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Les créneaux de la semaine type se mettent en pause sur ces périodes ; les stages ci-dessous
            prennent le relais au planning.
          </div>
        </div>
        <Link
          href="/stages"
          className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
          style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}
        >
          Gérer les stages →
        </Link>
      </div>
      <div className="flex flex-col gap-2.5">
        {stages.map((s) => (
          <Link
            key={s.id}
            href={`/stages?stage=${s.id}`}
            className="flex items-center gap-3.5 rounded-xl px-3.5 py-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${s.color}` }}
          >
            <div className="flex-1">
              <div className="text-sm font-semibold">{s.nom}</div>
              <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                {s.periodeLabel} · {s.lieu}
              </div>
            </div>
          </Link>
        ))}
        {stages.length === 0 && (
          <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Aucun stage enregistré pour l&apos;instant.
          </div>
        )}
      </div>
    </Card>
  );

  const datesSpecifiques = (
    <Card>
      <SectionTitle>Dates spécifiques (compétitions, réunions…)</SectionTitle>
      {session?.role === "ADMIN" ? (
        <EcheancesAdmin echeances={echeances.map((e) => ({ id: e.id, date: e.date.toISOString(), titre: e.titre, detail: e.detail, color: e.color }))} />
      ) : (
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
          {echeances.length === 0 && (
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Aucune échéance enregistrée.
            </div>
          )}
          <div className="text-[12px] mt-1" style={{ color: "var(--ink-muted)" }}>
            Seul un administrateur peut ajouter ou modifier ces dates.
          </div>
        </div>
      )}
    </Card>
  );

  return <CalendrierClient vueEnsemble={vueEnsemble} semaineType={semaineType} vacances={vacances} datesSpecifiques={datesSpecifiques} />;
}
