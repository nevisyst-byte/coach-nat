export function parseHeureMin(v: string) {
  const [h, m] = v.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

type Plage = { debutMin: number; finMin: number };

// Dispose une liste d'événements horodatés en colonnes côte à côte quand ils
// se chevauchent (même logique qu'un calendrier jour Google/Outlook) : les
// événements qui se suivent sans jamais se recouvrir restent seuls sur toute
// la largeur, ceux qui se recouvrent dans le temps se partagent la largeur
// en colonnes égales — partagé entre Planning (semaine) et le Calendrier
// saison (détail d'un jour).
export function disposerParColonnes<T extends Plage>(evenements: T[]): (T & { col: number; nbCols: number })[] {
  const tries = [...evenements].sort((a, b) => a.debutMin - b.debutMin || a.finMin - b.finMin);
  const resultat: (T & { col: number; nbCols: number })[] = [];
  let cluster: (T & { col: number; nbCols: number })[] = [];
  let finCluster = -Infinity;

  function clore() {
    if (cluster.length === 0) return;
    const nbCols = Math.max(...cluster.map((e) => e.col)) + 1;
    for (const e of cluster) e.nbCols = nbCols;
    resultat.push(...cluster);
    cluster = [];
  }

  for (const e of tries) {
    if (cluster.length > 0 && e.debutMin >= finCluster) {
      clore();
      finCluster = -Infinity;
    }
    const colonnesOccupees = new Set(cluster.filter((x) => x.finMin > e.debutMin).map((x) => x.col));
    let col = 0;
    while (colonnesOccupees.has(col)) col++;
    cluster.push({ ...e, col, nbCols: 1 });
    finCluster = Math.max(finCluster, e.finMin);
  }
  clore();
  return resultat;
}
