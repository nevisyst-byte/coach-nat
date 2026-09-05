import * as React from 'react';

/** Choix exclusif ou multiple dans une rangée compacte (variant, intensité, nage, filtre de groupe). */
export interface ChipProps {
  children?: React.ReactNode;
  selected?: boolean;
  /** Couleur de bordure à l'état sélectionné — par défaut --cyan ; passer la couleur de filière si pertinent */
  accent?: string;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Chip(props: ChipProps): JSX.Element;
