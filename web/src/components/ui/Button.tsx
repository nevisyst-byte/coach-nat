// Bouton partagé — avant ce composant, chaque écran réimplémentait ses
// propres <button style={{...}}> (120+ occurrences, couleurs et tailles
// dérivant peu à peu), donnant une hiérarchie primaire/secondaire/danger
// incohérente d'un écran à l'autre. Reprend les styles déjà dominants dans
// le code (dégradé bleu primaire, rouge pour "Supprimer"...) pour ne pas
// tout redessiner, juste les rendre systématiques.
export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const SIZES: Record<"sm" | "md", string> = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-4 py-2.5 text-[13px]",
};

function styleFor(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case "primary":
      return { background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", border: "1px solid transparent" };
    case "danger":
      return { background: "rgba(232,68,43,0.12)", color: "#FF9179", border: "1px solid rgba(232,68,43,0.4)" };
    case "ghost":
      return { background: "transparent", color: "#7FDCFF", border: "1px solid transparent", textDecoration: "underline" };
    case "secondary":
    default:
      return { background: "rgba(255,255,255,0.05)", color: "var(--ink)", border: "1px solid var(--border-strong)" };
  }
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  style,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <button
      {...rest}
      className={`rounded-[10px] font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${SIZES[size]} ${className}`}
      style={{ ...styleFor(variant), ...style }}
    >
      {children}
    </button>
  );
}
