import { prisma } from "./prisma";

// Nageur.presenceRate est un champ stocké (pas une vue calculée) : il doit
// être recalculé chaque fois qu'un pointage change, sinon il reste figé à
// sa valeur par défaut (0%) même quand le nageur a réellement été pointé
// présent — c'est le bug remonté par le coach. Les présences sont liées
// par nom (Presence.nomPersonne), pas par id, donc on retrouve le nageur
// par correspondance de nom.
export async function recalculerPresenceRate(nomPersonne: string) {
  const presences = await prisma.presence.findMany({ where: { nomPersonne, role: "SWIMMER" }, select: { etat: true } });
  if (presences.length === 0) return;
  const favorable = presences.filter((p) => p.etat === "PRESENT" || p.etat === "RETARD").length;
  const presenceRate = Math.round((favorable / presences.length) * 100);
  await prisma.nageur.updateMany({ where: { nom: nomPersonne }, data: { presenceRate } });
}
