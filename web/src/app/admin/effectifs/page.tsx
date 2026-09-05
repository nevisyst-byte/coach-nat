import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EffectifsAdmin } from "@/components/admin/EffectifsAdmin";

export default async function AdminEffectifsPage() {
  const rows = await prisma.categorieEffectif.findMany({ orderBy: [{ pole: "asc" }, { nom: "asc" }] });

  return (
    <Card>
      <SectionTitle right="Utilisé sur le tableau de bord général">Effectifs par catégorie</SectionTitle>
      <EffectifsAdmin rows={rows.map((r) => ({ id: r.id, nom: r.nom, pole: r.pole, count: r.count }))} />
    </Card>
  );
}
