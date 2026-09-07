import { prisma } from "./prisma";
import { buildManualBlocs, distanceSection, type SectionManuelle } from "./seance-manual";
import type { Bloc } from "./seance-generator";

export type SeanceDepuisPlan = {
  planId: string;
  nomPlan: string;
  items: { sectionId: string; bloc: Bloc; pourcentage: number | null }[];
};

// Contenu de séance dérivé du plan d'entraînement actif d'un groupe pour une
// date donnée (celui dont [dateDebut,dateFin] couvre cette date), avec les
// éventuels ajustements en % appliqués section par section — calculé à la
// lecture, comme l'objectif des phases, sans rien à retoucher à la main une
// fois le plan planifié.
export async function seanceDepuisPlan(groupeId: string, date: Date): Promise<SeanceDepuisPlan | null> {
  const plan = await prisma.planEntrainement.findFirst({
    where: { groupes: { some: { id: groupeId } }, dateDebut: { lte: date }, dateFin: { gte: date } },
    include: { ajustements: { where: { groupeId, date } } },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return null;

  const pourcentageParSection = new Map<string, number>(plan.ajustements.map((a) => [a.sectionId, a.pourcentage]));
  const sectionsBrutes = plan.sections as unknown as SectionManuelle[];
  const sectionsAjustees = sectionsBrutes.map((s) => {
    const pct = pourcentageParSection.get(s.id);
    if (!pct) return s;
    return { ...s, sets: s.sets.map((set) => ({ ...set, distance: Math.max(1, Math.round((set.distance * (100 + pct)) / 100)) })) };
  });

  const sectionsAvecSets = sectionsAjustees.filter((s) => s.sets.length > 0);
  const blocs = buildManualBlocs(plan.heureDebut ?? "17:00", sectionsAjustees);

  return {
    planId: plan.id,
    nomPlan: plan.nom,
    items: sectionsAvecSets.map((s, i) => ({ sectionId: s.id, bloc: blocs[i], pourcentage: pourcentageParSection.get(s.id) ?? null })),
  };
}

export function volumePlan(sections: SectionManuelle[]) {
  return sections.reduce((sum, s) => sum + distanceSection(s), 0);
}
