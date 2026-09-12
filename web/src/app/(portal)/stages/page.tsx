import { prisma } from "@/lib/prisma";
import { StagesClient } from "@/components/portal/StagesClient";
import { Card } from "@/components/ui/Card";
import type { Combo } from "@/lib/seance-generator";
import type { SectionManuelle } from "@/lib/seance-manual";

export default async function StagesPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage: stageId } = await searchParams;

  const [stagesRaw, groupes, coachs, modeles] = await Promise.all([
    prisma.stage.findMany({ include: { jours: true, creneaux: true }, orderBy: { createdAt: "asc" } }),
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
    prisma.coach.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.modeleSeance.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  if (stagesRaw.length === 0) {
    return (
      <Card>
        <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          Aucun stage pour le moment.
        </div>
      </Card>
    );
  }

  const selected = stagesRaw.find((s) => s.id === stageId) ?? stagesRaw[0];
  const full = await prisma.stage.findUniqueOrThrow({
    where: { id: selected.id },
    include: { jours: { orderBy: { jour: "asc" } }, creneaux: { include: { coach: { include: { user: true } } } } },
  });

  const stages = stagesRaw.map((s) => ({
    id: s.id,
    nom: s.nom,
    periodeLabel: s.periodeLabel,
    lieu: s.lieu,
    groupesLabel: s.groupesLabel,
    coachsLabel: s.coachsLabel,
    statut: s.statut,
    color: s.color,
    inscrits: s.inscrits,
    places: s.places,
    budgetLabel: s.budgetLabel,
    regleLabel: s.regleLabel,
    volumeM: s.creneaux.reduce((a, c) => a + c.volume, 0),
    nbCreneaux: s.creneaux.length,
  }));

  const groupesOptions = [...groupes.map((g) => g.nom), "Tous groupes"];

  return (
    <StagesClient
      stage={{
        id: full.id,
        nom: full.nom,
        periodeLabel: full.periodeLabel,
        lieu: full.lieu,
        jours: full.jours.map((j) => ({ jour: j.jour, dateLabel: j.dateLabel })),
        creneaux: full.creneaux.map((c) => ({
          id: c.id,
          jour: c.jour,
          debut: c.debut,
          fin: c.fin,
          type: c.type,
          groupe: c.groupe,
          bassin: c.bassin,
          theme: c.theme,
          volume: c.volume,
          variant: c.variant,
          intensite: c.intensite,
          nage: c.nage,
          combos: c.combos as unknown as Combo[] | null,
          sections: c.sections as unknown as SectionManuelle[] | null,
          coachId: c.coachId,
          coach: c.coach ? { user: { name: c.coach.user.name } } : null,
        })),
      }}
      stages={stages}
      groupesOptions={groupesOptions}
      coachs={coachs.map((c) => ({ id: c.id, nom: c.user.name }))}
      modeles={modeles.map((m) => ({
        id: m.id,
        nom: m.nom,
        theme: m.theme,
        heureDebut: m.heureDebut,
        combos: m.combos as unknown as Combo[] | null,
        volumeNage: m.volumeNage,
        sections: m.sections as unknown as SectionManuelle[] | null,
      }))}
    />
  );
}
