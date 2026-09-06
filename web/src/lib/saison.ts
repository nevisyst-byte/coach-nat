import { prisma } from "@/lib/prisma";

export async function getActiveSaison() {
  return prisma.saison.findFirst({ where: { active: true } });
}

/** "2026-2027" -> "26/27", pour le badge compact de l'en-tête. */
export function shortLabel(label: string) {
  const [a, b] = label.split("-");
  return a && b ? `${a.slice(-2)}/${b.slice(-2)}` : label;
}

export async function setActiveSaison(saisonId: string) {
  await prisma.$transaction([
    prisma.saison.updateMany({ where: { active: true }, data: { active: false } }),
    prisma.saison.update({ where: { id: saisonId }, data: { active: true } }),
  ]);
}

/** Enregistre/actualise, pour la saison active, le groupe et le coach d'un
 * nageur — sans jamais réécrire les Inscription des saisons précédentes.
 * À appeler chaque fois que Nageur.groupeId est créé ou modifié. */
export async function upsertInscriptionActive(nageurId: string, groupeId: string | null) {
  const saison = await getActiveSaison();
  if (!saison) return;
  const groupe = groupeId ? await prisma.groupe.findUnique({ where: { id: groupeId } }) : null;
  await prisma.inscription.upsert({
    where: { nageurId_saisonId: { nageurId, saisonId: saison.id } },
    create: { nageurId, saisonId: saison.id, groupeId, coachId: groupe?.coachId ?? null },
    update: { groupeId, coachId: groupe?.coachId ?? null },
  });
}
