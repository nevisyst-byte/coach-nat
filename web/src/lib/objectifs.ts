import { THEMES } from "./thematique-generator";

// Vocabulaire d'objectifs d'entraînement partagé entre la saisie manuelle de
// séance (objectif par zone), la page Groupes (objectif en cours d'un
// groupe) et son affichage sur les créneaux du planning — même liste,
// mêmes couleurs partout. Les 5 premiers reprennent tels quels les thèmes
// de la page Thématiques ; Technique et Récupération complètent le
// vocabulaire pour les zones qui ne relèvent pas d'une filière physiologique.
export const OBJECTIFS: { nom: string; color: string }[] = [
  ...THEMES.map((t) => ({ nom: t.nom, color: t.color })),
  { nom: "Technique", color: "#7D91AE" },
  { nom: "Récupération", color: "#C9A9FF" },
];

export function couleurObjectif(nom: string | null | undefined): string {
  return OBJECTIFS.find((o) => o.nom === nom)?.color ?? "#61789B";
}

export type PlanThemeLite = { theme: string; dateDebut: Date; dateFin: Date };

// Objectif réellement affiché pour un groupe à une date donnée : le plan
// d'entraînement (niveau macro) dont la période couvre cette date si il
// existe, sinon le champ manuel de repli (Groupe.objectif) — pour ne rien
// casser pour les groupes qui n'ont pas (encore) de plan planifié.
export function objectifActuel(plans: PlanThemeLite[], objectifManuel: string | null, date: Date = new Date()): string | null {
  const t = date.getTime();
  const plan = plans.find((p) => p.dateDebut.getTime() <= t && t <= p.dateFin.getTime());
  return plan?.theme ?? objectifManuel;
}
