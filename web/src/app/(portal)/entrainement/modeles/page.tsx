import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { ModelesSeanceClient } from "@/components/portal/ModelesSeanceClient";
import { normalizeCombos } from "@/lib/seance-generator";
import type { SectionManuelle } from "@/lib/seance-manual";

export default async function ModelesSeancePage() {
  const modeles = await prisma.modeleSeance.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <Card>
      <ModelesSeanceClient
        modeles={modeles.map((m) => ({
          id: m.id,
          nom: m.nom,
          theme: m.theme,
          heureDebut: m.heureDebut,
          combos: normalizeCombos(m.combos),
          volumeNage: m.volumeNage,
          sections: m.sections as unknown as SectionManuelle[] | null,
        }))}
      />
    </Card>
  );
}
