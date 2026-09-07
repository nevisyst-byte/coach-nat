import type { Bloc } from "./seance-generator";

export type SetLigne = {
  id: string;
  reps: number;
  distance: number;
  label: string;
  allure: string;
  repos: string;
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
  return { id: uid(), reps: 4, distance: 50, label: "", allure: "", repos: "" };
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

        const titre = [`${s.reps}×${s.distance}`, s.label.trim()].filter(Boolean).join(" ");
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
