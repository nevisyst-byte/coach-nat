import { prisma } from "./prisma";

// Nageur.presenceRate est un champ stocké (pas une vue calculée) : il doit
// être recalculé chaque fois qu'un pointage change, sinon il reste figé à
// sa valeur par défaut (0%) même quand le nageur a réellement été pointé
// présent — c'est le bug remonté par le coach. On calcule par nageurId
// (lien stable) plutôt que par nomPersonne : matcher par nom cassait
// silencieusement l'historique dès qu'un nageur était renommé (typo
// corrigée, nom complété...), les anciennes lignes de présence gardant
// l'ancien nom pour toujours. Les présences pas encore liées (nageurId
// NULL, saisies avant l'ajout de ce lien) sont quand même comptées si leur
// nomPersonne correspond encore au nom actuel du nageur.
export async function recalculerPresenceRate(nageurId: string, nomPersonne: string) {
  const presences = await prisma.presence.findMany({
    where: { role: "SWIMMER", OR: [{ nageurId }, { nageurId: null, nomPersonne } ] },
    select: { etat: true },
  });
  if (presences.length === 0) return;
  const favorable = presences.filter((p) => p.etat === "PRESENT" || p.etat === "RETARD").length;
  const presenceRate = Math.round((favorable / presences.length) * 100);
  await prisma.nageur.update({ where: { id: nageurId }, data: { presenceRate } });
}
