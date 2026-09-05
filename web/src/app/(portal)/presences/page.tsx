import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { SeanceSelect } from "@/components/portal/SeanceSelect";
import { PresenceRoster } from "@/components/portal/PresenceRoster";
import { JOURS } from "@/lib/format";

export default async function PresencesPage({ searchParams }: { searchParams: Promise<{ slot?: string }> }) {
  const [creneaux, creneauxStage, coachs] = await Promise.all([
    prisma.creneau.findMany({ include: { groupe: true } }),
    prisma.creneauStage.findMany({ include: { stage: true } }),
    prisma.coach.findMany({ include: { user: true } }),
  ]);

  const options = [
    ...creneaux.map((c) => ({ value: `reg:${c.id}`, label: `${JOURS[c.jour]} ${c.debut} · ${c.groupe.nom}` })),
    ...creneauxStage.map((c) => ({ value: `stage:${c.id}`, label: `${c.stage.nom} · ${JOURS[c.jour]} ${c.debut} · ${c.groupe}` })),
  ];

  if (options.length === 0) {
    return (
      <Card>
        <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          Aucune séance planifiée pour le moment.
        </div>
      </Card>
    );
  }

  const { slot } = await searchParams;
  const contextKey = slot && options.some((o) => o.value === slot) ? slot : options[0].value;
  const [kind, id] = contextKey.split(":");

  let groupeNom: string | null = null;
  if (kind === "reg") {
    const c = creneaux.find((x) => x.id === id);
    groupeNom = c?.groupe.nom ?? null;
  } else {
    const c = creneauxStage.find((x) => x.id === id);
    groupeNom = c && c.groupe !== "Tous groupes" ? c.groupe : null;
  }

  const nageurs = await prisma.nageur.findMany({ where: groupeNom ? { groupe: { nom: groupeNom } } : {}, include: { groupe: true } });
  const presences = await prisma.presence.findMany({ where: { contextKey } });
  const etatMap = new Map(presences.map((p) => [p.nomPersonne, p.etat]));

  const rosterNageurs = nageurs.map((n) => ({ nom: n.nom, initiales: n.initiales, sousTitre: n.groupe?.categorie ?? n.categorie, etat: etatMap.get(n.nom) ?? "PRESENT" }));
  const rosterStaff = coachs.map((c) => ({ nom: c.user.name, initiales: c.initials, sousTitre: c.accessLevel, etat: etatMap.get(c.user.name) ?? "PRESENT" }));

  const compte = { PRESENT: 0, RETARD: 0, ABSENT: 0, EXCUSE: 0 } as Record<string, number>;
  for (const p of rosterNageurs) compte[p.etat]++;
  const total = rosterNageurs.length || 1;
  const taux = Math.round(((compte.PRESENT + compte.RETARD) / total) * 100);
  const tauxColor = taux >= 85 ? "#2ECC8F" : taux >= 70 ? "#F2B33D" : "#E8442B";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3.5 flex-wrap">
        <SeanceSelect value={contextKey} options={options} />
        <div className="flex gap-3.5 flex-wrap flex-1">
          {[
            { label: "Présent", color: "#2ECC8F" },
            { label: "Retard", color: "#F2B33D" },
            { label: "Absent", color: "#E8442B" },
            { label: "Excusé", color: "#8CC4FF" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-body)" }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {[
          { v: compte.PRESENT, l: "Présents", color: "#2ECC8F" },
          { v: compte.RETARD, l: "Retards", color: "#F2B33D" },
          { v: compte.ABSENT, l: "Absents", color: "#E8442B" },
          { v: compte.EXCUSE, l: "Excusés", color: "#8CC4FF" },
        ].map((r) => (
          <Card key={r.l} padding={16}>
            <div className="font-display text-[34px] leading-none" style={{ color: r.color }}>
              {r.v}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--ink-secondary)" }}>
              {r.l}
            </div>
          </Card>
        ))}
        <Card padding={16} className="flex flex-col justify-center">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: "var(--ink-secondary)" }}>Taux de présence</span>
            <span className="font-bold" style={{ color: tauxColor }}>
              {taux}%
            </span>
          </div>
          <div className="h-2.5 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="h-full rounded-md" style={{ width: `${taux}%`, background: tauxColor }} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 items-start" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(400px,1fr))" }}>
        <PresenceRoster title="Nageurs" people={rosterNageurs} contextKey={contextKey} role="SWIMMER" />
        <PresenceRoster title="Encadrement" people={rosterStaff} contextKey={contextKey} role="COACH" />
      </div>
    </div>
  );
}
