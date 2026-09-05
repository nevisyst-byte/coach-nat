import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EcheancesAdmin } from "@/components/admin/EcheancesAdmin";

export default async function AdminEcheancesPage() {
  const echeances = await prisma.echeance.findMany({ orderBy: { date: "asc" } });

  return (
    <Card>
      <SectionTitle>Échéances de la saison</SectionTitle>
      <EcheancesAdmin echeances={echeances.map((e) => ({ id: e.id, date: e.date.toISOString(), titre: e.titre, detail: e.detail, color: e.color }))} />
    </Card>
  );
}
