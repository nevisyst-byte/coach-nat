import { Card } from "@/components/ui/Card";
import { PlanningEntrainementClient } from "@/components/portal/PlanningEntrainementClient";
import { getEntrainementData } from "@/lib/entrainement-data";

export default async function PlanningEntrainementPage() {
  const { groupesParPole, plans, creneauxParGroupe, modeles } = await getEntrainementData();

  return (
    <Card>
      <PlanningEntrainementClient groupesParPole={groupesParPole} creneauxParGroupe={creneauxParGroupe} plans={plans} modeles={modeles} />
    </Card>
  );
}
