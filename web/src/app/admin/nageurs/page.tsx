import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { NageursAdmin } from "@/components/admin/NageursAdmin";

export default async function AdminNageursPage() {
  const [nageurs, groupes] = await Promise.all([
    prisma.nageur.findMany({ orderBy: { nom: "asc" } }),
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
  ]);

  return (
    <Card>
      <SectionTitle>Nageurs</SectionTitle>
      <NageursAdmin
        nageurs={nageurs.map((n) => ({ id: n.id, nom: n.nom, age: n.age, categorie: n.categorie, specialite: n.specialite, groupeId: n.groupeId, pointsFFN: n.pointsFFN, presenceRate: n.presenceRate }))}
        groupes={groupes.map((g) => ({ id: g.id, nom: g.nom }))}
      />
    </Card>
  );
}
