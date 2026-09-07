import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { PlanEntrainementClient } from "@/components/portal/PlanEntrainementClient";
import { POLE_LABELS, POLE_COLORS, POLE_ORDER } from "@/lib/theme";
import type { SectionManuelle } from "@/lib/seance-manual";

export default async function PlansEntrainementPage() {
  const [groupes, plans] = await Promise.all([
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
    prisma.planEntrainement.findMany({ include: { groupes: { select: { id: true, nom: true } } }, orderBy: { dateDebut: "desc" } }),
  ]);

  const groupesParPole = POLE_ORDER.map((pole) => ({
    pole,
    nom: POLE_LABELS[pole] ?? pole,
    color: POLE_COLORS[pole] ?? "#61789B",
    groupes: groupes.filter((g) => g.pole === pole).map((g) => ({ id: g.id, nom: g.nom })),
  })).filter((s) => s.groupes.length > 0);

  return (
    <Card>
      <PlanEntrainementClient
        groupesParPole={groupesParPole}
        plans={plans.map((p) => ({
          id: p.id,
          nom: p.nom,
          heureDebut: p.heureDebut,
          sections: p.sections as unknown as SectionManuelle[],
          dateDebut: p.dateDebut.toISOString(),
          dateFin: p.dateFin.toISOString(),
          groupes: p.groupes,
        }))}
      />
    </Card>
  );
}
