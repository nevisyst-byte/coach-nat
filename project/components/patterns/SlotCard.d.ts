import * as React from 'react';

/**
 * Créneau de planning. Hiérarchie imposée : état d'encadrement, puis groupe, puis coach,
 * puis les faits secondaires (horaire, effectif, bassin) sous un filet.
 * @startingPoint section="Patterns" subtitle="Créneau de planning hebdomadaire" viewport="700x220"
 */
export interface SlotCardProps {
  /** « Assuré », « Remplacé », « À couvrir » */
  state: React.ReactNode;
  stateTone?: 'ok' | 'warn' | 'danger';
  group: React.ReactNode;
  coach: React.ReactNode;
  /** Faits secondaires, séparés automatiquement par des points médians */
  facts?: React.ReactNode[];
  onClick?: () => void;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export function SlotCard(props: SlotCardProps): JSX.Element;
