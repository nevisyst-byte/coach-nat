import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { BibliothequeClient } from "@/components/portal/BibliothequeClient";
import { getEntrainementData } from "@/lib/entrainement-data";
import { normalizeCombos } from "@/lib/seance-generator";
import type { SectionManuelle } from "@/lib/seance-manual";

export default async function ModelesSeancePage() {
  const [modelesRaw, { plans, groupesParPole, creneauxParGroupe }] = await Promise.all([
    prisma.modeleSeance.findMany({ orderBy: { createdAt: "desc" } }),
    getEntrainementData(),
  ]);

  const modeles = modelesRaw.map((m) => ({
    id: m.id,
    nom: m.nom,
    theme: m.theme,
    heureDebut: m.heureDebut,
    combos: normalizeCombos(m.combos),
    volumeNage: m.volumeNage,
    sections: m.sections as unknown as SectionManuelle[] | null,
  }));

  return (
    <Card>
      <BibliothequeClient modeles={modeles} plans={plans} groupesParPole={groupesParPole} creneauxParGroupe={creneauxParGroupe} />
    </Card>
  );
}
