import * as React from 'react';

/**
 * Bouton d'action COACH-NAT.
 * @startingPoint section="Core" subtitle="Actions primaires, secondaires et discrètes" viewport="700x180"
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** primary = action unique de l'écran ; danger = suppression / notation ; ghost = action de retour */
  variant?: 'primary' | 'danger' | 'secondary' | 'ghost' | 'quiet' | 'dashed';
  /** m par défaut ; l pour les CTA pleine largeur sur mobile (>= 46px) */
  size?: 's' | 'm' | 'l';
  /** Glyphe unicode placé avant le libellé */
  icon?: React.ReactNode;
  block?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
