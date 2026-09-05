import { prisma } from "@/lib/prisma";
import { SeanceCreator } from "@/components/portal/SeanceCreator";

export default async function SeancePage() {
  const groupes = await prisma.groupe.findMany({ orderBy: { nom: "asc" } });
  return <SeanceCreator groupes={groupes.map((g) => g.nom)} />;
}
