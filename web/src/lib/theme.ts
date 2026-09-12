export const COLORS = {
  blue: "#1E7BFF",
  blueDeep: "#0F5FD6",
  cyan: "#24C8FF",
  red: "#E8442B",
  redDeep: "#B92E19",
  green: "#2ECC8F",
  amber: "#F2B33D",
  violet: "#8C6BFF",
} as const;

export const NAV_GROUPS = [
  {
    label: "Pilotage",
    items: [{ id: "general", href: "/general", icon: "◈", label: "Tableau de bord" }],
  },
  {
    label: "Planning",
    items: [
      { id: "planning", href: "/planning", icon: "▦", label: "Planning" },
      { id: "stages", href: "/stages", icon: "⛭", label: "Stages" },
      { id: "calendrier", href: "/calendrier", icon: "▣", label: "Calendrier saison" },
    ],
  },
  {
    label: "Nageurs",
    items: [
      { id: "nageurs", href: "/nageurs", icon: "⚑", label: "Nageurs" },
      { id: "groupes", href: "/groupes", icon: "▤", label: "Groupes" },
    ],
  },
  {
    label: "Plan d'entraînement",
    items: [
      { id: "entrainement", href: "/entrainement", icon: "✦", label: "Plan d'entraînement" },
      { id: "entrainement-planning", href: "/entrainement/planning", icon: "▨", label: "Calendrier des plans" },
    ],
  },
  {
    label: "Outils",
    items: [{ id: "allures", href: "/outils/allures", icon: "⏱", label: "Allures & VMA" }],
  },
] as const;

export const MOBILE_TABS = [
  { id: "accueil", href: "/general?vue=coach", pathname: "/general", vueParam: "coach", icon: "◉", label: "Accueil" },
  { id: "planning", href: "/planning?vue=moi", pathname: "/planning", vueParam: "moi", icon: "▤", label: "Planning" },
  { id: "nageurs", href: "/nageurs", pathname: "/nageurs", icon: "⚑", label: "Nageurs" },
  { id: "entrainement", href: "/entrainement", pathname: "/entrainement", icon: "✦", label: "Plan d'entraînement" },
] as const;

export const POLE_ORDER = ["COMPETITION", "FORMATION", "SAUVETAGE", "LOISIR"] as const;

export const POLE_LABELS: Record<string, string> = {
  FORMATION: "Formation",
  COMPETITION: "Compétition",
  SAUVETAGE: "Sauvetage",
  LOISIR: "Loisir & inclusion",
};

export const POLE_COLORS: Record<string, string> = {
  FORMATION: COLORS.amber,
  COMPETITION: COLORS.blue,
  SAUVETAGE: COLORS.green,
  LOISIR: COLORS.violet,
};
