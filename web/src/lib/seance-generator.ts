// objectif optionnel : filière travaillée sur cette zone (Volume aérobie,
// Vitesse, Technique...) — voir lib/objectifs.ts. Absent sur les séances
// générées automatiquement ou créées avant l'ajout de ce champ.
export type Bloc = { phase: string; distance: string; contenu: string; consigne: string; objectif?: string };

const DEPARTS: Record<number, string> = { 100: "1'40", 200: "3'15", 300: "4'45", 400: "6'10" };

function r100(m: number) {
  return Math.max(100, Math.round(m / 100) * 100);
}

function fmtM(m: number) {
  return m >= 1000 ? m.toLocaleString("fr-FR") + " m" : m + " m";
}

export function genererSeance(variant: string, intensite: string, nage: string, volumeCible: number): { resume: string; blocs: Bloc[] } {
  const total = volumeCible;
  const dEch = r100(total * 0.2);
  const dTech = r100(total * 0.16);
  const dPrincCible = total - dEch - dTech - r100(total * 0.1);
  const repDist = total >= 8000 ? 400 : total >= 6000 ? 300 : total >= 4000 ? 200 : 100;
  const nSeries = total >= 7000 ? 3 : total >= 4000 ? 2 : 1;
  const parSerie = Math.max(2, Math.round(dPrincCible / repDist / nSeries));
  const dPrinc = nSeries * parSerie * repDist;
  const dRet = total - dEch - dTech - dPrinc;
  const nEduc = Math.max(4, Math.round(dTech / 50));

  const blocs: Bloc[] = [
    {
      phase: "Échauff.",
      distance: fmtM(dEch),
      contenu: `${fmtM(r100(dEch * 0.5))} crawl souple + ${Math.round(r100(dEch * 0.5) / 50)}×50 éducatifs ${nage.toLowerCase()}`,
      consigne: "Amplitude, respiration 3 temps",
    },
    {
      phase: "Technique",
      distance: fmtM(dTech),
      contenu: `${nEduc}×50 ${variant.toLowerCase()} — départ 1'00`,
      consigne: "Focus coulée et fréquence",
    },
    {
      phase: "Principal",
      distance: fmtM(dPrinc),
      contenu: `${nSeries}×(${parSerie}×${repDist} ${nage.toLowerCase()}) à ${intensite.toLowerCase()} — départ ${DEPARTS[repDist]}`,
      consigne: nSeries > 1 ? "Récup 2' entre les séries · dernière série en accélération" : "Tenue de l'allure, 2 derniers en accélération",
    },
    {
      phase: "Retour",
      distance: fmtM(dRet),
      contenu: `${fmtM(dRet)} souple 2 nages alternées`,
      consigne: "Fréquence basse, relâchement",
    },
  ];

  return { resume: `${variant} · ${intensite} · ${nage} · ${fmtM(total)}`, blocs };
}
