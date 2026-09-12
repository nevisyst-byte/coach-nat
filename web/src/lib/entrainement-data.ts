import { prisma } from "@/lib/prisma";
import { POLE_LABELS, POLE_COLORS, POLE_ORDER } from "@/lib/theme";
import type { SectionManuelle } from "@/lib/seance-manual";
import type { Combo } from "@/lib/seance-generator";

// Données communes aux deux écrans de planification d'un plan
// d'entraînement (grille par objectif, calendrier par groupe) — une seule
// requête partagée pour que les deux restent en phase.
export async function getEntrainementData() {
  const [groupes, plans, creneaux, modeles] = await Promise.all([
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
    prisma.planEntrainement.findMany({ include: { groupes: { select: { id: true, nom: true } } }, orderBy: { dateDebut: "desc" } }),
    prisma.creneau.findMany({ orderBy: [{ jour: "asc" }, { debut: "asc" }] }),
    prisma.modeleSeance.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const groupesParPole = POLE_ORDER.map((pole) => ({
    pole,
    nom: POLE_LABELS[pole] ?? pole,
    color: POLE_COLORS[pole] ?? "#61789B",
    groupes: groupes.filter((g) => g.pole === pole).map((g) => ({ id: g.id, nom: g.nom })),
  })).filter((s) => s.groupes.length > 0);

  const creneauxParGroupe: Record<string, { id: string; jour: number; debut: string }[]> = {};
  for (const c of creneaux) (creneauxParGroupe[c.groupeId] ??= []).push({ id: c.id, jour: c.jour, debut: c.debut });

  return {
    groupesParPole,
    creneauxParGroupe,
    plans: plans.map((p) => ({
      id: p.id,
      nom: p.nom,
      theme: p.theme,
      heureDebut: p.heureDebut,
      variant: p.variant,
      intensite: p.intensite,
      nage: p.nage,
      volumeNage: p.volumeNage,
      combos: p.combos as unknown as Combo[] | null,
      sections: p.sections as unknown as SectionManuelle[] | null,
      dateDebut: p.dateDebut.toISOString(),
      dateFin: p.dateFin.toISOString(),
      groupes: p.groupes,
    })),
    modeles: modeles.map((m) => ({
      id: m.id,
      nom: m.nom,
      theme: m.theme,
      heureDebut: m.heureDebut,
      combos: m.combos as unknown as Combo[] | null,
      volumeNage: m.volumeNage,
      sections: m.sections as unknown as SectionManuelle[] | null,
    })),
  };
}
