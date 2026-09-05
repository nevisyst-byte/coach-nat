import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { GroupesAdmin } from "@/components/admin/GroupesAdmin";

export default async function AdminGroupesPage() {
  const [groupes, coachs] = await Promise.all([
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
    prisma.coach.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);

  return (
    <Card>
      <SectionTitle>Groupes</SectionTitle>
      <GroupesAdmin
        groupes={groupes.map((g) => ({ id: g.id, nom: g.nom, pole: g.pole, categorie: g.categorie, color: g.color, objectif: g.objectif, coachId: g.coachId }))}
        coachs={coachs.map((c) => ({ id: c.id, nom: c.user.name }))}
      />
    </Card>
  );
}
