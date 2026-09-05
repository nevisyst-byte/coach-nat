import * as React from 'react';

/**
 * Indicateur chiffré d'en-tête de tableau de bord.
 * @startingPoint section="Data" subtitle="Bandeau d'indicateurs chiffrés" viewport="700x180"
 */
export interface StatCardProps {
  /** Valeur déjà formatée : « 312 », « 82% », « 14 h » */
  value?: React.ReactNode;
  label?: React.ReactNode;
  /** Glyphe unicode, pas d'emoji */
  icon?: React.ReactNode;
  /** Variation relative : « +14 vs N-1 », « 2 à couvrir » */
  delta?: React.ReactNode;
  deltaTone?: 'ok' | 'warn' | 'danger' | 'neutral';
  accent?: 'blue' | 'red';
  style?: React.CSSProperties;
}

export function StatCard(props: StatCardProps): JSX.Element;
