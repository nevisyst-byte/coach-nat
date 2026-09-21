// Les 3 familles qui décrivent le contenu d'une séance (variant/intensité/
// nage), avec leurs options — une seule liste, partagée entre le mode auto
// (combos) et la saisie manuelle (un set peut cocher plusieurs valeurs par
// axe, comme un combo), pour que le coach retrouve toujours les mêmes
// valeurs (ex. "4 nages", "Spécialité") quel que soit le mode.
export const AXES = [
  { key: "variant" as const, titre: "Variant", aide: "Support technique", options: ["Nage complète", "Bras", "Jambes", "Éducatif"] },
  { key: "intensite" as const, titre: "Intensité", aide: "Allure de travail", options: ["Allure neutre", "Négatif split", "Progressif", "Seuil", "Allure 400", "Allure 200", "Vitesse"] },
  { key: "nage" as const, titre: "Nages", aide: "Support de nage", options: ["4 nages", "Spécialité", "Papillon", "Dos", "Brasse", "Crawl"] },
];

// Abréviations compactes pour l'affichage en petits boutons (saisie
// manuelle, une ligne par set) — inutile en mode auto où les options
// s'affichent en toutes lettres, moins denses.
export const AXE_ABBR: Record<string, Record<string, string>> = {
  variant: { "Nage complète": "NC", Bras: "Bras", Jambes: "Jbs", Éducatif: "Éduc" },
  intensite: { "Allure neutre": "AN", "Négatif split": "NS", Progressif: "Prog", Seuil: "Seuil", "Allure 400": "A400", "Allure 200": "A200", Vitesse: "Vit" },
  nage: { "4 nages": "4N", Spécialité: "Spé", Papillon: "Pap", Dos: "Dos", Brasse: "Bra", Crawl: "Cr" },
};
