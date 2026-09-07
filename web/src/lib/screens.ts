export type Hero = {
  img: string;
  pos: string;
  veil: "left" | "corner";
  kicker: string;
  title: string;
  text: string;
  cta1?: { label: string; href: string };
  cta2?: { label: string; href: string };
};

export const TITLES: Record<string, [string, string, string]> = {
  "/general": ["Tableau de bord", "Vue club · tous groupes, tous coachs", "Pilotage"],
  "/planning": ["Planning", "Vue globale ou personnelle · code couleur par état d'encadrement", "Planning"],
  "/stages": ["Stages", "Sessions hors saison · effectif, encadrement et budget", "Planning"],
  "/presences": ["Présences", "Pointage nageurs et coachs par séance", "Planning"],
  "/calendrier": ["Calendrier saison", "Séances, compétitions et congés de la saison", "Planning"],
  "/absences": ["Absences & congés", "Indisponibilités coach et absences nageurs", "Planning"],
  "/nageurs": ["Nageurs", "Effectif suivi · cotation FFN et rankings", "Nageurs"],
  "/entrainement": ["Entraînement", "Un plan par groupe, du thème macro au contenu chiffré", "Entraînement"],
};

function titleForGeneral(vue?: string | null): [string, string, string] {
  if (vue === "coach") return ["Tableau de bord coach", "Vue personnelle · mes groupes et ma charge", "Pilotage"];
  return TITLES["/general"];
}

const VEIL_L = "linear-gradient(90deg,rgba(8,13,24,0.97) 0%,rgba(8,13,24,0.92) 52%,rgba(8,13,24,0.28) 100%)";
const VEIL_C = "linear-gradient(100deg,rgba(8,13,24,0.96) 0%,rgba(8,13,24,0.86) 46%,rgba(18,41,75,0.40) 100%)";

export const HERO: Record<string, Hero> = {
  "general-globale": {
    img: "/assets/swimmer.jpg", pos: "right center", veil: "left",
    kicker: "Saison 2025 / 2026", title: "Le club en un coup d'œil",
    text: "Licenciés, coachs et créneaux hebdomadaires. Suis les alertes et les progressions du club.",
    cta1: { label: "Créer une séance", href: "/entrainement" },
    cta2: { label: "Absences & congés", href: "/absences" },
  },
  "general-coach": {
    img: "/assets/coach-poolside.jpg", pos: "center 35%", veil: "left",
    kicker: "Vue personnelle", title: "Ta semaine au bord du bassin",
    text: "Tes groupes, ta charge et les feuilles de présence qui attendent ta saisie.",
    cta1: { label: "Mon planning", href: "/planning?vue=moi" },
    cta2: { label: "Saisir les présences", href: "/presences" },
  },
  "/planning": {
    img: "/assets/pool-lanes.jpg", pos: "center 42%", veil: "corner",
    kicker: "Vue globale ou personnelle", title: "Qui couvre quoi, cette semaine",
    text: "Le code couleur suit l'état d'encadrement : assuré, remplacé, à couvrir.",
    cta1: { label: "Stages", href: "/stages" },
    cta2: { label: "Déclarer une absence", href: "/absences" },
  },
  "/stages": {
    img: "/assets/pool-lanes.jpg", pos: "center 55%", veil: "corner",
    kicker: "Sessions hors saison", title: "Stages et cycles intensifs",
    text: "Plusieurs créneaux par jour, encadrement et budget suivis session par session.",
    cta1: { label: "Pointer les présences", href: "/presences" },
  },
  "/presences": {
    img: "/assets/coach-poolside.jpg", pos: "center 40%", veil: "left",
    kicker: "Feuille de séance", title: "Pointage nageurs et contenu de la séance",
    text: "Quatre états par nageur : présent, retard, absent, excusé. Le taux se recalcule à chaque clic.",
    cta1: { label: "Voir le planning", href: "/planning" },
  },
  "/calendrier": {
    img: "/assets/pool-lanes.jpg", pos: "center 30%", veil: "corner",
    kicker: "Vue saison", title: "Compétitions, stages et congés",
    text: "Les échéances de la saison et les jours où l'encadrement est incomplet.",
    cta1: { label: "Stages", href: "/stages" },
    cta2: { label: "Congés", href: "/absences" },
  },
  "/absences": {
    img: "/assets/coach-poolside.jpg", pos: "center 45%", veil: "left",
    kicker: "Indisponibilités", title: "Congés coachs et absences nageurs",
    text: "Chaque congé validé signale les créneaux à recouvrir sur le planning global.",
    cta1: { label: "Planning", href: "/planning" },
  },
  "/nageurs": {
    img: "/assets/swimmer.jpg", pos: "center 35%", veil: "left",
    kicker: "Effectif suivi", title: "Tous les nageurs, toutes les cotations",
    text: "Points FFN, rangs départemental, régional et national, et assiduité.",
    cta1: { label: "Créer une séance", href: "/entrainement" },
  },
  "/entrainement": {
    img: "/assets/flip-turn.jpg", pos: "center 40%", veil: "corner",
    kicker: "Macro → micro", title: "Un plan par groupe, semaine après semaine",
    text: "Choisis un groupe, planifie un objectif sur une période, détaille-le (variant/intensité/nage ou saisie manuelle) — appliqué automatiquement à chaque créneau, modifiable au cas par cas.",
    cta1: { label: "Planning", href: "/planning" },
  },
};

export function heroVeilCss(hero: Hero) {
  const veil = hero.veil === "left" ? VEIL_L : VEIL_C;
  return `${veil}, url('${hero.img}')`;
}

export function titleFor(pathname: string, vue?: string | null) {
  if (pathname.startsWith("/nageurs/")) {
    return { title: "Fiche nageur", subtitle: "Performances, technique et assiduité", pole: "Nageurs" };
  }
  const t = pathname === "/general" ? titleForGeneral(vue) : TITLES[pathname];
  if (!t) return { title: "", subtitle: "", pole: "" };
  return { title: t[0], subtitle: t[1], pole: t[2] };
}

export function heroFor(pathname: string, vue?: string | null): Hero | null {
  if (pathname.startsWith("/nageurs/")) {
    return {
      img: "/assets/flip-turn.jpg", pos: "center 45%", veil: "left",
      kicker: "Suivi individuel", title: "Fiche nageur",
      text: "Meilleures performances, notation technique par nage et assiduité.",
      cta1: { label: "Tous les nageurs", href: "/nageurs" },
    };
  }
  if (pathname === "/general") return HERO[vue === "coach" ? "general-coach" : "general-globale"];
  return HERO[pathname] ?? null;
}
