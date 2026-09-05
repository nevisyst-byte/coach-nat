import * as React from 'react';

/** Barre de proportion : charge par coach, remplissage d'un stage, taux de présence, note technique. */
export interface MeterBarProps {
  label?: React.ReactNode;
  /** Ligne d'appoint sous la barre (facultative) */
  value?: React.ReactNode;
  /** Valeur alignée à droite du libellé : « 14 h · 5 créneaux » */
  meta?: React.ReactNode;
  /** Largeur du remplissage, en pourcentage CSS : "88%" */
  pct: string;
  color?: string;
  /** 7px au lieu de 9px, pour les listes denses */
  compact?: boolean;
  style?: React.CSSProperties;
}

export function MeterBar(props: MeterBarProps): JSX.Element;
