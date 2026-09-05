import * as React from 'react';

/** Absence de données : recherche sans résultat, jour de planning vide, stage sans créneau. */
export interface EmptyStateProps {
  title: React.ReactNode;
  /** Ce que l'utilisateur peut faire pour sortir de l'état vide */
  hint?: React.ReactNode;
  action?: React.ReactNode;
  /** Version encadrée en pointillés, pour une case de grille plutôt qu'un écran */
  compact?: boolean;
  style?: React.CSSProperties;
}

export function EmptyState(props: EmptyStateProps): JSX.Element;
