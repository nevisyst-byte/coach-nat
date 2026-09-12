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

// Chaque axe (variant/intensité/nage) d'une répartition accepte plusieurs
// valeurs cochées à la fois (ex. Crawl + Dos dans le même bloc principal),
// pas un choix unique — jointes par " + " partout où il faut un texte.
export type Combo = { variant: string[]; intensite: string[]; nage: string[]; pourcentage: number };

function j(valeurs: string[]) {
  return valeurs.join(" + ");
}

// Les combos existants en base (créés avant le passage au choix multiple
// par axe) ont variant/intensite/nage en chaîne simple plutôt qu'en
// tableau — on les enveloppe ici pour rester compatible avec ces plans/
// créneaux/modèles déjà enregistrés, sans les toucher ni forcer de
// migration de données.
export function normalizeCombos(raw: unknown): Combo[] | null {
  if (!Array.isArray(raw)) return null;
  const toArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : typeof v === "string" ? [v] : []);
  return raw.map((c) => ({
    variant: toArr((c as Record<string, unknown>).variant),
    intensite: toArr((c as Record<string, unknown>).intensite),
    nage: toArr((c as Record<string, unknown>).nage),
    pourcentage: Number((c as Record<string, unknown>).pourcentage) || 0,
  }));
}

// Une séance à plusieurs répartitions (ex. 60% Crawl/Allure 400/Nage
// complète + 40% Dos/Seuil/Éducatif) : échauffement et retour communs,
// un bloc "Principal" par répartition, dimensionné à son pourcentage du
// volume total.
export function genererSeanceMulti(combos: Combo[], volumeCible: number): { resume: string; blocs: Bloc[] } {
  if (combos.length === 0) return { resume: "", blocs: [] };
  if (combos.length === 1) return genererSeance(j(combos[0].variant), j(combos[0].intensite), j(combos[0].nage), volumeCible);

  const total = volumeCible;
  const dEch = r100(total * 0.2);
  const dTech = r100(total * 0.16);
  const dRet = r100(total * 0.1);
  const dPrincCible = total - dEch - dTech - dRet;
  const premier = combos[0];
  const nEduc = Math.max(4, Math.round(dTech / 50));

  const blocsPrincipaux: Bloc[] = combos.map((c) => {
    const dCombo = r100((dPrincCible * c.pourcentage) / 100);
    const repDist = dCombo >= 3000 ? 400 : dCombo >= 1500 ? 300 : dCombo >= 800 ? 200 : 100;
    const nSeries = Math.max(1, Math.round(dCombo / repDist));
    return {
      phase: `Principal · ${j(c.nage)}`,
      distance: fmtM(dCombo),
      contenu: `${nSeries}×${repDist} ${j(c.nage).toLowerCase()} (${j(c.variant).toLowerCase()}) à ${j(c.intensite).toLowerCase()} — départ ${DEPARTS[repDist]}`,
      consigne: `${c.pourcentage}% du volume principal · tenue de l'allure`,
    };
  });

  const blocs: Bloc[] = [
    {
      phase: "Échauff.",
      distance: fmtM(dEch),
      contenu: `${fmtM(r100(dEch * 0.5))} crawl souple + ${Math.round(r100(dEch * 0.5) / 50)}×50 éducatifs`,
      consigne: "Amplitude, respiration 3 temps",
    },
    {
      phase: "Technique",
      distance: fmtM(dTech),
      contenu: `${nEduc}×50 ${j(premier.variant).toLowerCase()} — départ 1'00`,
      consigne: "Focus coulée et fréquence",
    },
    ...blocsPrincipaux,
    {
      phase: "Retour",
      distance: fmtM(dRet),
      contenu: `${fmtM(dRet)} souple 2 nages alternées`,
      consigne: "Fréquence basse, relâchement",
    },
  ];

  const resume = combos.map((c) => `${c.pourcentage}% ${j(c.nage)}/${j(c.intensite)}/${j(c.variant)}`).join(" + ") + ` · ${fmtM(total)}`;
  return { resume, blocs };
}
