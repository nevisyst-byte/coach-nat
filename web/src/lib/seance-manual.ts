import type { Bloc } from "./seance-generator";

export type SetLigne = {
  id: string;
  reps: number;
  distance: number;
  label: string;
  allure: string;
  repos: string;
  // Plusieurs nages sur le même exercice (ex. crawl + dos en alternance) —
  // vide = pas de nage précisée, comme avant l'ajout de ce champ.
  nages: string[];
};

export type SectionManuelle = {
  id: string;
  nom: string;
  objectif: string;
  sets: SetLigne[];
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function nouvelleSet(): SetLigne {
  return { id: uid(), reps: 4, distance: 50, label: "", allure: "", repos: "", nages: [] };
}

export function nouvelleSection(nom = ""): SectionManuelle {
  return { id: uid(), nom, objectif: "", sets: [nouvelleSet()] };
}

// "3:40" ou "0:40" -> secondes. Tolérant : entrée vide ou invalide -> 0
// (le calcul d'heure ignore juste cette ligne plutôt que planter).
function parseMinSec(v: string): number {
  const m = v.trim().match(/^(\d+):(\d{1,2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function parseHeure(v: string): number {
  const m = v.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function formatHeure(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes)) % (24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function fmtDistance(m: number) {
  return m >= 1000 ? m.toLocaleString("fr-FR") + " m" : `${m} m`;
}

export function distanceSet(s: SetLigne) {
  return (s.reps || 0) * (s.distance || 0);
}

export function distanceSection(section: SectionManuelle) {
  return section.sets.reduce((sum, s) => sum + distanceSet(s), 0);
}

export function volumeTotalManuel(sections: SectionManuelle[]) {
  return sections.reduce((sum, s) => sum + distanceSection(s), 0);
}

// Répartition du volume par nage pour le camembert "par nage" — un exercice
// à plusieurs nages (ex. crawl + dos) répartit sa distance à parts égales
// entre elles plutôt que de la compter en double.
function parseDistance(fmt: string): number {
  return parseInt(fmt.replace(/[^\d]/g, ""), 10) || 0;
}

// Reconstruit des sections éditables à partir de blocs déjà compilés (séance
// auto-générée par combos/variant, ou séance de stage) — une section par
// phase, avec un seul set reprenant le volume total et le contenu textuel
// du bloc comme label. Ce n'est pas la décomposition reps×distance
// d'origine (perdue à la compilation en texte), mais un point de départ
// éditable qui couvre toute la séance plutôt qu'une section vide, quand le
// coach veut ajuster une séance générée pour une seule date.
export function blocsToSections(blocs: Bloc[]): SectionManuelle[] {
  return blocs.map((b) => ({
    id: uid(),
    nom: b.phase,
    objectif: b.objectif ?? "",
    sets: [{ id: uid(), reps: 1, distance: parseDistance(b.distance), label: b.contenu, allure: "", repos: "", nages: [] }],
  }));
}

export function volumeParNage(sections: SectionManuelle[]): { nage: string; m: number }[] {
  const parNage = new Map<string, number>();
  for (const section of sections) {
    for (const s of section.sets) {
      if (s.nages.length === 0) continue;
      const part = distanceSet(s) / s.nages.length;
      for (const nage of s.nages) parNage.set(nage, (parNage.get(nage) ?? 0) + part);
    }
  }
  return Array.from(parNage.entries()).map(([nage, m]) => ({ nage, m: Math.round(m) }));
}

// Compile les sections saisies à la main en Bloc[] — le même format que le
// générateur automatique — pour réutiliser tel quel l'aperçu éditable, la
// sauvegarde en modèle et la planification. L'heure de début n'existe que
// pour ce calcul : seul son résultat (les heures inscrites dans le contenu)
// est conservé une fois compilé.
export function buildManualBlocs(heureDebut: string, sections: SectionManuelle[]): Bloc[] {
  let curseur = parseHeure(heureDebut);
  let cumule = 0;

  return sections
    .filter((section) => section.sets.length > 0)
    .map((section) => {
      let distanceBloc = 0;
      const lignes: string[] = [];

      for (const s of section.sets) {
        const d = distanceSet(s);
        distanceBloc += d;
        cumule += d;
        const heureLigne = formatHeure(curseur);
        const allureSec = parseMinSec(s.allure);
        const reposSec = parseMinSec(s.repos);
        curseur += (s.reps * allureSec + reposSec) / 60;

        const titre = [`${s.reps}×${s.distance}`, s.nages.join(" + "), s.label.trim()].filter(Boolean).join(" ");
        const details = [s.allure ? `départ ${s.allure}` : null, s.repos ? `repos ${s.repos}` : null].filter(Boolean).join(" · ");
        lignes.push(`${heureLigne} — ${titre}${details ? ` (${details})` : ""}`);
      }

      return {
        phase: section.nom.trim() || "Section",
        distance: fmtDistance(distanceBloc),
        contenu: lignes.join("\n"),
        consigne: `${fmtDistance(distanceBloc)} ce bloc · ${fmtDistance(cumule)} cumulés depuis ${heureDebut}`,
        objectif: section.objectif || undefined,
      } satisfies Bloc;
    });
}
