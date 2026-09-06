import { prisma } from "@/lib/prisma";
import { SeanceCreator } from "@/components/portal/SeanceCreator";

export default async function SeancePage() {
  const [groupes, modeles] = await Promise.all([
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
    prisma.seancePlan.findMany({ orderBy: { updatedAt: "desc" } }),
  ]);
  return (
    <SeanceCreator
      groupes={groupes.map((g) => g.nom)}
      modeles={modeles.map((m) => ({
        id: m.id,
        nom: m.nom,
        groupeNom: m.groupeNom,
        variant: m.variant,
        intensite: m.intensite,
        nage: m.nage,
        volumeCible: m.volumeCible,
      }))}
    />
  );
}
