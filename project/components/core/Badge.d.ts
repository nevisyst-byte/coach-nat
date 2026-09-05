import * as React from 'react';

/** Étiquette d'état : présence, statut de stage, état d'encadrement, niveau de cotation. */
export interface BadgeProps {
  children?: React.ReactNode;
  /** ok = assuré / validé ; warn = remplacé / en attente ; danger = à couvrir / absent */
  tone?: 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
  dot?: boolean;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
