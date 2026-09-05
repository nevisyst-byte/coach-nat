import * as React from 'react';

/** Ligne de personne : pointage de présence, liste d'absences, encadrement d'un stage. */
export interface PersonRowProps {
  initials: React.ReactNode;
  name: React.ReactNode;
  /** Catégorie, rôle, ou date + motif */
  meta?: React.ReactNode;
  /** rouge = signal d'alerte sur la personne (présence faible, blessure) */
  avatarTone?: 'blue' | 'red' | 'neutral';
  /** Badge d'état ou groupe de boutons de pointage */
  right?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function PersonRow(props: PersonRowProps): JSX.Element;
