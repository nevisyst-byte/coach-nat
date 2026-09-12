import { Card } from "@/components/ui/Card";
import { EntrainementClient } from "@/components/portal/EntrainementClient";
import { getEntrainementData } from "@/lib/entrainement-data";

export default async function EntrainementPage() {
  const { groupesParPole, plans, creneauxParGroupe, modeles } = await getEntrainementData();

  return (
    <Card>
      <EntrainementClient groupesParPole={groupesParPole} creneauxParGroupe={creneauxParGroupe} plans={plans} modeles={modeles} />
    </Card>
  );
}
