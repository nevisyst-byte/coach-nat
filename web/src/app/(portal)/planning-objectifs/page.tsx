import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { PlanningObjectifsClient } from "@/components/portal/PlanningObjectifsClient";
import { POLE_LABELS, POLE_COLORS, POLE_ORDER } from "@/lib/theme";
import { getSession } from "@/lib/auth";

export default async function PlanningObjectifsPage() {
  const session = await getSession();
  const groupes = await prisma.groupe.findMany({
    include: { phasesObjectif: { orderBy: { dateDebut: "asc" } } },
    orderBy: { nom: "asc" },
  });

  const groupesParPole = POLE_ORDER.map((pole) => ({
    pole,
    nom: POLE_LABELS[pole] ?? pole,
    color: POLE_COLORS[pole] ?? "#61789B",
    groupes: groupes
      .filter((g) => g.pole === pole)
      .map((g) => ({
        id: g.id,
        nom: g.nom,
        objectifManuel: g.objectif,
        phases: g.phasesObjectif.map((p) => ({ id: p.id, theme: p.theme, dateDebut: p.dateDebut.toISOString(), dateFin: p.dateFin.toISOString() })),
      })),
  })).filter((section) => section.groupes.length > 0);

  return (
    <Card>
      <PlanningObjectifsClient groupesParPole={groupesParPole} isAdmin={session?.role === "ADMIN"} />
    </Card>
  );
}
