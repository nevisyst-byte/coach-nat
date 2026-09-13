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
// avec un % individuel par valeur cochée (ex. 30% 4 nages + 20% Crawl +
// 50% Brasse) réglable par une barre glissable — pas besoin d'ouvrir une
// répartition séparée par valeur.
export type ValeurPourcentage = { valeur: string; pourcentage: number };
export type Combo = { variant: ValeurPourcentage[]; intensite: ValeurPourcentage[]; nage: ValeurPourcentage[]; pourcentage: number };

function noms(valeurs: ValeurPourcentage[]) {
  return valeurs.map((v) => v.valeur).join(" + ");
}

// Nombre déterministe dans [0,1) à partir d'une chaîne — pas de vraie
// aléa : la même graine donne toujours le même résultat (stable au
// rechargement), seule la graine change d'une semaine à l'autre.
function hashGraine(cle: string): number {
  let h = 0;
  for (let i = 0; i < cle.length; i++) h = (h * 31 + cle.charCodeAt(i)) >>> 0;
  return (h % 100000) / 100000;
}

// Sans graine (comportement historique) : toutes les valeurs cochées d'un
// axe sont combinées dans le même bloc (ex. "Crawl + Dos"), identique à
// chaque appel. Avec une graine (ex. plan+numéro de semaine), une seule
// valeur est tirée au sort parmi celles cochées — pondérée par son % —
// pour casser la répétition d'un plan sur toute sa durée sans que le
// coach ait à replanifier semaine par semaine.
function resoudre(valeurs: ValeurPourcentage[], graine: string | undefined): string {
  if (!graine || valeurs.length <= 1) return noms(valeurs);
  const total = valeurs.reduce((s, v) => s + (v.pourcentage || 0), 0) || 1;
  const cible = hashGraine(graine) * total;
  let acc = 0;
  for (const v of valeurs) {
    acc += v.pourcentage || 0;
    if (cible < acc) return v.valeur;
  }
  return valeurs[valeurs.length - 1].valeur;
}

// Numéro de semaine (0 = la semaine de `base`) d'une date par rapport à un
// point de départ — pour dériver une graine différente chaque semaine
// d'un même plan.
export function semaineIndexDepuis(base: Date, date: Date): number {
  return Math.floor((date.getTime() - base.getTime()) / (7 * 86400000));
}

// Rythme de variation d'un plan — décision du coach à la création, pas une
// règle fixe : "aucune" garde le même contenu toute la durée (comportement
// d'origine), "semaine" tire au sort une fois par semaine, "jour" à chaque
// occurrence (utile si un même groupe a plusieurs créneaux/semaine et que
// le coach veut aussi les différencier entre eux).
export type VariationPlan = "aucune" | "semaine" | "jour";

// Graine à passer à genererSeanceMulti pour une occurrence donnée d'un plan
// — centralise la correspondance rythme → graine pour que tous les points
// d'appel (génération réelle, aperçu du formulaire, liste des prochaines
// séances) restent synchronisés.
export function graineOccurrence(planId: string, variation: VariationPlan, dateDebutPlan: Date, date: Date): string | undefined {
  if (variation === "aucune") return undefined;
  if (variation === "jour") return `${planId}-j${Math.floor(date.getTime() / 86400000)}`;
  return `${planId}-s${semaineIndexDepuis(dateDebutPlan, date)}`;
}

// Les combos existants en base (créés avant le passage au choix multiple
// par axe, puis avant le % individuel par valeur) ont chaque axe en chaîne
// simple ou en tableau de chaînes plutôt qu'en tableau {valeur,pourcentage}
// — on les enveloppe ici pour rester compatible avec ces plans/créneaux/
// modèles déjà enregistrés, sans les toucher ni forcer de migration.
export function normalizeCombos(raw: unknown): Combo[] | null {
  if (!Array.isArray(raw)) return null;
  const toValeurs = (v: unknown): ValeurPourcentage[] => {
    if (typeof v === "string") return [{ valeur: v, pourcentage: 100 }];
    if (!Array.isArray(v)) return [];
    if (v.every((x) => typeof x === "string")) {
      const valeurs = v as string[];
      const part = Math.round(100 / (valeurs.length || 1));
      return valeurs.map((valeur, i) => ({ valeur, pourcentage: i === valeurs.length - 1 ? 100 - part * (valeurs.length - 1) : part }));
    }
    return v
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
      .map((x) => ({ valeur: String(x.valeur ?? ""), pourcentage: Number(x.pourcentage) || 0 }))
      .filter((n) => n.valeur);
  };
  return raw.map((c) => ({
    variant: toValeurs((c as Record<string, unknown>).variant),
    intensite: toValeurs((c as Record<string, unknown>).intensite),
    nage: toValeurs((c as Record<string, unknown>).nage),
    pourcentage: Number((c as Record<string, unknown>).pourcentage) || 0,
  }));
}

// Une séance à plusieurs répartitions (ex. 60% Crawl/Allure 400/Nage
// complète + 40% Dos/Seuil/Éducatif) : échauffement et retour communs,
// un bloc "Principal" par répartition, dimensionné à son pourcentage du
// volume total.
export function genererSeanceMulti(combos: Combo[], volumeCible: number, graine?: string): { resume: string; blocs: Bloc[] } {
  if (combos.length === 0) return { resume: "", blocs: [] };
  if (combos.length === 1) {
    const c = combos[0];
    return genererSeance(
      resoudre(c.variant, graine && `${graine}-variant0`),
      resoudre(c.intensite, graine && `${graine}-intensite0`),
      resoudre(c.nage, graine && `${graine}-nage0`),
      volumeCible
    );
  }

  const total = volumeCible;
  const dEch = r100(total * 0.2);
  const dTech = r100(total * 0.16);
  const dRet = r100(total * 0.1);
  const dPrincCible = total - dEch - dTech - dRet;
  const premier = combos[0];
  const nEduc = Math.max(4, Math.round(dTech / 50));
  const variantResolu = (c: Combo, i: number) => resoudre(c.variant, graine && `${graine}-variant${i}`);
  const intensiteResolue = (c: Combo, i: number) => resoudre(c.intensite, graine && `${graine}-intensite${i}`);
  const nageResolue = (c: Combo, i: number) => resoudre(c.nage, graine && `${graine}-nage${i}`);

  const blocsPrincipaux: Bloc[] = combos.map((c, i) => {
    const dCombo = r100((dPrincCible * c.pourcentage) / 100);
    const repDist = dCombo >= 3000 ? 400 : dCombo >= 1500 ? 300 : dCombo >= 800 ? 200 : 100;
    const nSeries = Math.max(1, Math.round(dCombo / repDist));
    const nage = nageResolue(c, i);
    return {
      phase: `Principal · ${nage}`,
      distance: fmtM(dCombo),
      contenu: `${nSeries}×${repDist} ${nage.toLowerCase()} (${variantResolu(c, i).toLowerCase()}) à ${intensiteResolue(c, i).toLowerCase()} — départ ${DEPARTS[repDist]}`,
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
      contenu: `${nEduc}×50 ${variantResolu(premier, 0).toLowerCase()} — départ 1'00`,
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

  const resume = combos.map((c, i) => `${c.pourcentage}% ${nageResolue(c, i)}/${intensiteResolue(c, i)}/${variantResolu(c, i)}`).join(" + ") + ` · ${fmtM(total)}`;
  return { resume, blocs };
}
