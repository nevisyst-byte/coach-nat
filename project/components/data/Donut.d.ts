import * as React from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
  /** Valeur absolue affichée avant le pourcentage : « 7 200 m » */
  meta?: React.ReactNode;
}

/**
 * Répartition d'un volume en parts (charge par nage, par intensité, par variant).
 * @startingPoint section="Data" subtitle="Camembert de répartition avec légende" viewport="700x200"
 */
export interface DonutProps {
  slices: DonutSlice[];
  centerValue?: React.ReactNode;
  centerLabel?: React.ReactNode;
  size?: number;
  /** Épaisseur du trou central, en px d'inset */
  ring?: number;
  style?: React.CSSProperties;
}

export function Donut(props: DonutProps): JSX.Element;
