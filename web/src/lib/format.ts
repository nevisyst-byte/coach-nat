export function hoursBetween(debut: string, fin: string) {
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
}

export function fmtKm(meters: number) {
  return (meters / 1000).toFixed(1).replace(".", ",") + " km";
}

export function fmtM(meters: number) {
  return meters >= 1000 ? meters.toLocaleString("fr-FR") + " m" : meters + " m";
}

export function initialsColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsla(${h},70%,55%,0.22)`;
}

export const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export function isoWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = d.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

export function mondayOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const ETAT_LABEL: Record<string, string> = {
  ASSURE: "Assuré",
  REMPLACE: "Remplacé",
  A_COUVRIR: "À couvrir",
};

export const CRITERES = [
  "Départ / plongeon",
  "Coulée",
  "Amplitude",
  "Fréquence",
  "Coordination",
  "Respiration",
  "Virage",
  "Arrivée / touche",
];

export const ETAT_COLOR: Record<string, string> = {
  ASSURE: "#2ECC8F",
  REMPLACE: "#F2B33D",
  A_COUVRIR: "#E8442B",
};
