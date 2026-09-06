// Palette purement décorative (identité visuelle des 5 thèmes), volontairement
// distincte du code couleur de statut de l'app (vert/orange/rouge = assuré/
// remplacé/à couvrir) pour ne pas laisser croire à un état d'alerte.
const BLUE = "#1E7BFF", CYAN = "#24C8FF", VIOLET = "#8C6BFF", PINK = "#FF6FB0", TEAL = "#2DD4BF";

export const THEMES = [
  { nom: "Volume aérobie", color: BLUE, charge: "Charge 1", detail: "3 séances · dominante endurance, 4 500 m", consigne: "Allure neutre, fréquence basse" },
  { nom: "Seuil", color: CYAN, charge: "Charge 2", detail: "3 séances · travail au seuil, 4 000 m", consigne: "Séries longues, récup courte" },
  { nom: "VMA", color: VIOLET, charge: "Charge 3", detail: "3 séances · intermittent court, 3 200 m", consigne: "30\"/30\" et 50 m départ 1'00" },
  { nom: "Lactique", color: PINK, charge: "Charge 3", detail: "2 séances · tolérance lactique, 2 800 m", consigne: "Répétitions maximales, récup longue" },
  { nom: "Vitesse", color: TEAL, charge: "Affûtage", detail: "2 séances · volume réduit, qualité maximale", consigne: "Départs, coulées, 15 m lancés" },
] as const;

const MIX: Record<string, number[]> = {
  "Volume aérobie": [60, 22, 8, 4, 6],
  Seuil: [30, 45, 13, 6, 6],
  VMA: [24, 22, 38, 8, 8],
  Lactique: [22, 18, 14, 36, 10],
  Vitesse: [26, 12, 14, 12, 36],
};

const VOL_SEM = [4500, 4000, 3200, 2800, 2200];
const INTENSITE: Record<string, number> = { "Volume aérobie": 45, Seuil: 68, VMA: 84, Lactique: 95, Vitesse: 72 };

function fmtKm(m: number) {
  return (m / 1000).toFixed(1).replace(".", ",") + " km";
}

export function genererCycle(theme: string, variant: string, nage: string, cycleLen: number) {
  const themeIdx = Math.max(0, THEMES.findIndex((t) => t.nom === theme));

  const cycleSeances = Array.from({ length: cycleLen }, (_, i) => {
    const th = THEMES[(themeIdx + i) % THEMES.length];
    return {
      semaine: `Semaine ${i + 1}`,
      charge: th.charge,
      color: th.color,
      titre: th.nom,
      detail: `${variant} en ${nage.toLowerCase()} — ${th.detail} · ${th.consigne}`,
      tags: [variant, nage],
    };
  });

  const chargeSemaines = cycleSeances.map((cs, i) => {
    const mix = MIX[cs.titre];
    const vol = VOL_SEM[(themeIdx + i) % VOL_SEM.length];
    return {
      semaine: `S${i + 1}`,
      titre: cs.titre,
      volume: fmtKm(vol),
      hauteurPct: Math.round((vol / 4500) * 100),
      segments: THEMES.map((th, k) => ({ nom: th.nom, color: th.color, pct: mix[k] })),
    };
  });

  const totalVol = chargeSemaines.reduce((a, _c, i) => a + VOL_SEM[(themeIdx + i) % VOL_SEM.length], 0);
  const volumeThemes = THEMES.map((th, k) => {
    const m = chargeSemaines.reduce((a, c, i) => a + (VOL_SEM[(themeIdx + i) % VOL_SEM.length] * MIX[c.titre][k]) / 100, 0);
    return { nom: th.nom, color: th.color, metres: Math.round(m / 50) * 50, pct: Math.round((m / (totalVol || 1)) * 100) };
  });

  const courbeCharge = cycleSeances.map((cs, i) => ({ semaine: `S${i + 1}`, val: INTENSITE[cs.titre], color: cs.color, titre: cs.titre }));

  return { cycleSeances, chargeSemaines, volumeThemes, courbeCharge };
}
