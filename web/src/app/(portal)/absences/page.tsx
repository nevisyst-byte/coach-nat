import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";

const CONGE_STYLE: Record<string, [string, string]> = {
  VALIDE: ["rgba(46,204,143,0.14)", "#2ECC8F"],
  EN_ATTENTE: ["rgba(242,179,61,0.15)", "#F2B33D"],
};

const ABSENCE_STYLE: Record<string, [string, string]> = {
  VALIDEE: ["rgba(46,204,143,0.14)", "#2ECC8F"],
  A_TRAITER: ["rgba(232,68,43,0.16)", "#E8442B"],
  BLESSURE: ["rgba(242,179,61,0.15)", "#F2B33D"],
};

const ABSENCE_LABEL: Record<string, string> = { VALIDEE: "Validée", A_TRAITER: "À traiter", BLESSURE: "Blessure" };
const CONGE_LABEL: Record<string, string> = { VALIDE: "Validé", EN_ATTENTE: "En attente" };

export default async function AbsencesPage() {
  const [conges, absences] = await Promise.all([
    prisma.conge.findMany({ include: { coach: { include: { user: true } } } }),
    prisma.absence.findMany({ include: { nageur: true }, orderBy: { id: "desc" } }),
  ]);

  return (
    <div className="grid gap-4 items-start" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))" }}>
      <Card>
        <SectionTitle>Congés & indisponibilités coach</SectionTitle>
        <div className="flex flex-col gap-2.5">
          {conges.length === 0 && (
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Aucun congé déclaré.
            </div>
          )}
          {conges.map((c) => {
            const [bg, fg] = CONGE_STYLE[c.statut];
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${fg}` }}>
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {c.coach.user.name} · {c.periodeLabel}
                  </div>
                  <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                    {c.motif} · {c.impact}
                  </div>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-md" style={{ background: bg, color: fg }}>
                  {CONGE_LABEL[c.statut]}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>Absences nageurs</SectionTitle>
        <div className="flex flex-col gap-2.5">
          {absences.map((a) => {
            const [bg, fg] = ABSENCE_STYLE[a.statut];
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-[11px] px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <div
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: "rgba(30,123,255,0.22)" }}
                >
                  {a.nageur.initiales}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{a.nageur.nom}</div>
                  <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                    {a.date} · {a.motif}
                  </div>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-md" style={{ background: bg, color: fg }}>
                  {ABSENCE_LABEL[a.statut]}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
