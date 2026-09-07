import { prisma } from "./prisma";
import { buildManualBlocs, distanceSection, type SectionManuelle } from "./seance-manual";
import { genererSeance, type Bloc } from "./seance-generator";

export type SeanceDepuisPlan = {
  planId: string;
  nomPlan: string;
  editable: boolean;
  heureDebut: string;
  sections: SectionManuelle[] | null;
  items: { sectionId: string | null; bloc: Bloc; pourcentage: number | null }[];
};

// Contenu de séance dérivé du plan d'entraînement actif d'un groupe pour une
// date donnée (celui dont [dateDebut,dateFin] couvre cette date). Deux
// sources de détail possibles, au choix du coach à la création du plan :
// - `sections` (saisie manuelle) : structuré, ajustable en % section par
//   section (cf. ajustements) ;
// - `variant`/`intensite`/`nage`/`volumeNage` (génération auto) : recompilé
//   via genererSeance, contenu texte non ajustable en %.
// Si ni l'un ni l'autre n'est renseigné, le plan reste macro (badge thème
// seul, cf. objectifActuel) — calculé à la lecture, sans tâche de fond.
export async function seanceDepuisPlan(groupeId: string, date: Date): Promise<SeanceDepuisPlan | null> {
  const plan = await prisma.planEntrainement.findFirst({
    where: { groupes: { some: { id: groupeId } }, dateDebut: { lte: date }, dateFin: { gte: date } },
    include: { ajustements: { where: { groupeId, date } } },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return null;

  if (plan.sections) {
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
      editable: true,
      heureDebut: plan.heureDebut ?? "17:00",
      sections: sectionsAjustees,
      items: sectionsAvecSets.map((s, i) => ({ sectionId: s.id, bloc: blocs[i], pourcentage: pourcentageParSection.get(s.id) ?? null })),
    };
  }

  if (plan.variant && plan.intensite && plan.nage && plan.volumeNage) {
    const blocs = genererSeance(plan.variant, plan.intensite, plan.nage, plan.volumeNage).blocs;
    return {
      planId: plan.id,
      nomPlan: plan.nom,
      editable: false,
      heureDebut: plan.heureDebut ?? "17:00",
      sections: null,
      items: blocs.map((bloc) => ({ sectionId: null, bloc, pourcentage: null })),
    };
  }

  return null;
}

export function volumePlan(sections: SectionManuelle[]) {
  return sections.reduce((sum, s) => sum + distanceSection(s), 0);
}
