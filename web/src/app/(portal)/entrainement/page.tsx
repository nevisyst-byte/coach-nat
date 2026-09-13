import { Card } from "@/components/ui/Card";
import { PlanningEntrainementClient } from "@/components/portal/PlanningEntrainementClient";
import { getEntrainementData } from "@/lib/entrainement-data";

export default async function EntrainementPage() {
  const { groupesParPole, plans, creneauxParGroupe, zone } = await getEntrainementData();

  return (
    <Card>
      <PlanningEntrainementClient groupesParPole={groupesParPole} creneauxParGroupe={creneauxParGroupe} plans={plans} zone={zone} />
    </Card>
  );
}
