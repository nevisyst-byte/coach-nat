import { prisma } from "@/lib/prisma";
import { fetchFfnPerformances } from "@/lib/ffn";
import { getActiveSaison } from "@/lib/saison";

/** Relie un nageur à un IUF FFN et synchronise ses performances de la saison
 * en cours (sans toucher aux saisons précédentes). Complète aussi l'année de
 * naissance si elle n'est pas déjà connue, à partir de l'âge affiché sur la
 * performance FFN la plus récente (estimation, pas une vraie date de
 * naissance). Utilisé à la fois à la création d'un nageur et lors d'une
 * resynchronisation depuis sa fiche. */
export async function syncNageurFfn(nageurId: string, iuf: string) {
  const nageur = await prisma.nageur.findUniqueOrThrow({ where: { id: nageurId } });
  const { performances, anneeNaissanceEstimee } = await fetchFfnPerformances(iuf);

  const saison = await getActiveSaison();
  const saisonLabel = saison?.label ?? "2026-2027";
  const completerNaissance = !nageur.anneeNaissance && anneeNaissanceEstimee;

  await prisma.$transaction([
    prisma.nageur.update({
      where: { id: nageurId },
      data: {
        ffnIuf: iuf,
        ffnSyncedAt: new Date(),
        ...(completerNaissance ? { anneeNaissance: anneeNaissanceEstimee, age: new Date().getFullYear() - anneeNaissanceEstimee! } : {}),
      },
    }),
    prisma.performance.deleteMany({ where: { nageurId, saison: saisonLabel } }),
    prisma.performance.createMany({
      data: performances.map((p) => ({
        nageurId,
        epreuve: `${p.epreuve} (${p.bassin})`,
        temps: p.temps,
        points: p.points,
        niveau: p.niveau,
        // Le site FFN ne donne pas de delta saison-sur-saison ni de rang
        // national sur cette page (ça viendrait d'un outil de ranking
        // séparé, pas construit ici) — "—" plutôt qu'une valeur inventée.
        deltaSaison: "—",
        rangNat: "—",
        saison: saisonLabel,
      })),
    }),
  ]);

  return { count: performances.length, anneeNaissanceEstimee: completerNaissance ? anneeNaissanceEstimee : null };
}
