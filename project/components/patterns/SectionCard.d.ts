import * as React from 'react';

/**
 * Conteneur de section : le seul niveau de carte du portail.
 * @startingPoint section="Patterns" subtitle="Carte de section titrée" viewport="700x220"
 */
export interface SectionCardProps {
  title?: React.ReactNode;
  /** Précision alignée à droite du titre : « Heures / semaine », « 4 semaines » */
  meta?: React.ReactNode;
  /** Boutons de la section, rendus après le meta */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** Liseré supérieur coloré — réservé aux cartes dont la couleur porte un sens (nage, filière) */
  accent?: string;
  style?: React.CSSProperties;
}

export function SectionCard(props: SectionCardProps): JSX.Element;
