// Client pour ffn.extranat.fr (Fédération Française de Natation).
//
// Il n'existe pas d'API officielle : la recherche par nom passe par un vrai
// endpoint JSON interne (_recherche.php), mais les performances elles-mêmes
// ne sont disponibles qu'en HTML (page nat_recherche.php) — d'où le parsing
// avec cheerio ci-dessous, construit à partir d'un exemple réel de page.
// Le site peut changer sa structure sans préavis ; si le parsing casse un
// jour (recherche/sync qui renvoie 0 résultat pour un nageur qu'on sait
// inscrit), c'est le premier endroit à vérifier.

import * as cheerio from "cheerio";
import type { Element } from "domhandler";

const BASE = "https://ffn.extranat.fr/webffn";

export type FfnIndividu = { iuf: string; nom: string };

export async function searchFfnIndividus(query: string): Promise<FfnIndividu[]> {
  if (query.trim().length < 4) return [];
  const url = `${BASE}/_recherche.php?go=ind&idrch=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Recherche FFN : HTTP ${res.status}`);
  const data = (await res.json()) as { iuf: string; ind: string }[];
  return data.map((d) => ({ iuf: String(d.iuf), nom: d.ind }));
}

export type FfnPerformance = {
  epreuve: string;
  bassin: "25m" | "50m";
  temps: string;
  points: number;
  niveau: string;
  lieu: string;
  date: string;
  club: string;
};

const NIVEAU_LABEL: Record<string, string> = {
  "[INT]": "International",
  "[NAT]": "National",
  "[ZON]": "Interrégional",
  "[REG]": "Régional",
  "[DEP]": "Départemental",
};

export async function fetchFfnPerformances(iuf: string): Promise<FfnPerformance[]> {
  const url = `${BASE}/nat_recherche.php?idact=nat&idiuf=${encodeURIComponent(iuf)}&idrch_id=${encodeURIComponent(iuf)}&idopt=mpp`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Fiche FFN : HTTP ${res.status}`);
  const html = await res.text();
  return parsePerformancesHtml(html);
}

/** Extrait, à partir du HTML de la page MPP (nat_recherche.php?idopt=mpp), la
 * liste des performances. Séparé de fetchFfnPerformances pour être testable
 * hors-ligne à partir d'un échantillon HTML réel — voir la note en tête de
 * fichier sur le risque de rupture si le site change sa structure. */
export function parsePerformancesHtml(html: string): FfnPerformance[] {
  const $ = cheerio.load(html);

  const table = $("table").filter((_, el) => $(el).text().includes("Meilleures Performances Personnelles")).first();
  if (table.length === 0) return [];

  const performances: FfnPerformance[] = [];
  let bassin: "25m" | "50m" = "50m";

  // Le HTML source a des <tr> orphelins (sans <tbody> explicite) au milieu de
  // <thead> séparateurs de bassin — un parseur HTML5 (cheerio inclus, comme
  // un vrai navigateur) les enveloppe automatiquement dans des <tbody>
  // implicites. On parcourt donc chaque enfant direct de <table> (thead ou
  // tbody) et, pour un tbody, chacune de ses lignes.
  function parseRow(el: Element) {
    const cells = $(el).find("> th, > td");
    if (cells.length < 9) return;

    const epreuve = $(cells[0]).text().trim();
    const temps = $(cells[1]).text().trim();
    const pointsText = $(cells[3]).text().trim();
    const points = parseInt(pointsText.replace(/[^\d]/g, ""), 10) || 0;
    const lieuTexts = $(cells[4]).find("p").map((_, p) => $(p).text().trim()).get();
    const lieu = lieuTexts.join(" ");
    const date = $(cells[5]).text().trim();
    const niveauRaw = $(cells[6]).text().trim();
    const niveau = NIVEAU_LABEL[niveauRaw] ?? (niveauRaw.replace(/[[\]]/g, "") || "—");
    const club = $(cells[8]).text().trim();

    if (!epreuve || !temps) return;
    performances.push({ epreuve, bassin, temps, points, niveau, lieu, date, club });
  }

  table.children().each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    if (tag === "thead") {
      const text = $(el).text();
      if (text.includes("25 mètres")) bassin = "25m";
      else if (text.includes("50 mètres")) bassin = "50m";
    } else if (tag === "tbody") {
      $(el)
        .children("tr")
        .each((__, tr) => parseRow(tr));
    } else if (tag === "tr") {
      parseRow(el);
    }
  });

  return performances;
}
