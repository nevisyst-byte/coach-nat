// Format des temps tels que scrapés depuis la FFN : "26"41" (secondes),
// "2'04"33" (minutes'secondes"centièmes). Sert à comparer un temps courant
// au temps de début de saison pour afficher une progression (voir
// FicheNageur, colonne "Progression saison").
export function parseTemps(temps: string): number | null {
  const m = temps.trim().match(/^(?:(\d+)')?(\d{1,2})"(\d{2})$/);
  if (!m) return null;
  const minutes = m[1] ? parseInt(m[1], 10) : 0;
  const secondes = parseInt(m[2], 10);
  const centiemes = parseInt(m[3], 10);
  return minutes * 60 + secondes + centiemes / 100;
}

// "−0.42" (plus rapide, progrès) ou "+0.24" (plus lent) — même convention
// de signe que deltaSaison. null si l'un des deux temps n'est pas
// parsable (format inattendu) plutôt qu'une valeur trompeuse.
export function formatProgression(tempsActuel: string, tempsDebutSaison: string): string | null {
  const actuel = parseTemps(tempsActuel);
  const debut = parseTemps(tempsDebutSaison);
  if (actuel === null || debut === null) return null;
  const delta = actuel - debut;
  const signe = delta <= 0 ? "−" : "+";
  return `${signe}${Math.abs(delta).toFixed(2)}`;
}
