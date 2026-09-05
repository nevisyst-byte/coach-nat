// Calendrier scolaire officiel (zones A/B/C), saisi manuellement.
//
// ⚠️ IMPORTANT : ces dates ont été saisies de mémoire, sans accès à une source
// en ligne pour les vérifier (l'environnement où ce fichier a été écrit n'a
// pas d'accès réseau sortant). Elles couvrent l'année scolaire 2026-2027.
// Vérifie-les avant de t'y fier, sur la source officielle :
// https://www.education.gouv.fr/calendrier-scolaire
// À mettre à jour chaque année (ce fichier n'est PAS synchronisé automatiquement).

export type ZoneScolaire = "A" | "B" | "C";

export type PeriodeVacances = {
  nom: string;
  zone: ZoneScolaire | "TOUTES";
  debut: string; // YYYY-MM-DD, inclus
  fin: string; // YYYY-MM-DD, inclus
};

export const VACANCES_SCOLAIRES: PeriodeVacances[] = [
  // --- Année scolaire 2026-2027 ---
  { nom: "Vacances de la Toussaint", zone: "TOUTES", debut: "2026-10-17", fin: "2026-11-01" },
  { nom: "Vacances de Noël", zone: "TOUTES", debut: "2026-12-19", fin: "2027-01-03" },
  { nom: "Vacances d'Hiver", zone: "A", debut: "2027-02-06", fin: "2027-02-21" },
  { nom: "Vacances d'Hiver", zone: "B", debut: "2027-02-13", fin: "2027-02-28" },
  { nom: "Vacances d'Hiver", zone: "C", debut: "2027-02-20", fin: "2027-03-07" },
  { nom: "Vacances de Printemps", zone: "A", debut: "2027-04-10", fin: "2027-04-25" },
  { nom: "Vacances de Printemps", zone: "B", debut: "2027-04-17", fin: "2027-05-02" },
  { nom: "Vacances de Printemps", zone: "C", debut: "2027-04-24", fin: "2027-05-09" },
  { nom: "Vacances d'Été", zone: "TOUTES", debut: "2027-07-07", fin: "2027-08-31" },
];

function toDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** True si le jour donné tombe dans une période de vacances de cette zone (ou "TOUTES"). */
export function estEnVacances(date: Date, zone: ZoneScolaire): PeriodeVacances | null {
  const t = date.getTime();
  for (const p of VACANCES_SCOLAIRES) {
    if (p.zone !== "TOUTES" && p.zone !== zone) continue;
    if (t >= toDate(p.debut).getTime() && t <= toDate(p.fin).getTime()) return p;
  }
  return null;
}

/** True si au moins un jour de la liste tombe en vacances pour cette zone. */
export function semaineEnVacances(dates: Date[], zone: ZoneScolaire): PeriodeVacances | null {
  for (const d of dates) {
    const p = estEnVacances(d, zone);
    if (p) return p;
  }
  return null;
}
