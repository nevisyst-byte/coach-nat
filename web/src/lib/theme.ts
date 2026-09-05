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
    items: [
      { id: "general", href: "/general", icon: "◈", label: "Tableau de bord général" },
      { id: "coach", href: "/coach", icon: "◉", label: "Tableau de bord coach" },
    ],
  },
  {
    label: "Planning",
    items: [
      { id: "planning-global", href: "/planning", icon: "▦", label: "Planning global" },
      { id: "mon-planning", href: "/mon-planning", icon: "▤", label: "Mon planning" },
      { id: "stages", href: "/stages", icon: "⛭", label: "Stages" },
      { id: "presences", href: "/presences", icon: "✓", label: "Présences" },
      { id: "calendrier", href: "/calendrier", icon: "▣", label: "Calendrier" },
      { id: "absences", href: "/absences", icon: "✈", label: "Absences & congés" },
    ],
  },
  {
    label: "Nageurs",
    items: [
      { id: "nageurs", href: "/nageurs", icon: "⚑", label: "Nageurs" },
    ],
  },
  {
    label: "Entraînement",
    items: [
      { id: "seance", href: "/seance", icon: "✦", label: "Créateur de séance" },
      { id: "thematique", href: "/thematiques", icon: "⟳", label: "Thématiques" },
    ],
  },
] as const;

export const MOBILE_TABS = [
  { id: "accueil", href: "/coach", icon: "◉", label: "Accueil" },
  { id: "planning", href: "/mon-planning", icon: "▤", label: "Planning" },
  { id: "nageurs", href: "/nageurs", icon: "⚑", label: "Nageurs" },
  { id: "seance", href: "/seance", icon: "✦", label: "Séance" },
] as const;

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
