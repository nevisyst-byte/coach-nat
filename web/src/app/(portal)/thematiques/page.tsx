import { prisma } from "@/lib/prisma";
import { ThematiqueClient } from "@/components/portal/ThematiqueClient";

export default async function ThematiquesPage() {
  const groupes = await prisma.groupe.findMany({ orderBy: { nom: "asc" } });
  return <ThematiqueClient groupes={groupes.map((g) => g.nom)} />;
}
