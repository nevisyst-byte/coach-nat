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

  // Le temps de début de saison d'une épreuve doit survivre à chaque
  // resynchronisation (sinon la progression en cours de saison n'aurait
  // plus de référence) : on le récupère avant l'écrasement des lignes de
  // cette saison, par épreuve, et on le reporte sur la nouvelle ligne — ou,
  // si l'épreuve apparaît pour la première fois cette saison, le temps
  // fraîchement synchronisé devient lui-même la référence.
  const existantes = await prisma.performance.findMany({
    where: { nageurId, saison: saisonLabel },
    select: { epreuve: true, tempsDebutSaison: true, pointsDebutSaison: true },
  });
  const baselineParEpreuve = new Map(existantes.map((p) => [p.epreuve, { temps: p.tempsDebutSaison, points: p.pointsDebutSaison }]));

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
      data: performances.map((p) => {
        const epreuve = `${p.epreuve} (${p.bassin})`;
        const baseline = baselineParEpreuve.get(epreuve);
        return {
          nageurId,
          epreuve,
          temps: p.temps,
          points: p.points,
          niveau: p.niveau,
          // Le site FFN ne donne pas de delta saison-sur-saison ni de rang
          // national sur cette page (ça viendrait d'un outil de ranking
          // séparé, pas construit ici) — "—" plutôt qu'une valeur inventée.
          deltaSaison: "—",
          rangNat: "—",
          saison: saisonLabel,
          tempsDebutSaison: baseline?.temps ?? p.temps,
          pointsDebutSaison: baseline?.points ?? p.points,
        };
      }),
    }),
  ]);

  return { count: performances.length, anneeNaissanceEstimee: completerNaissance ? anneeNaissanceEstimee : null };
}
