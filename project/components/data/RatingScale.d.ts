import * as React from 'react';

/** Notation technique d'un critère de nage, de 1 à 5. Cibles tactiles de 44 px. */
export interface RatingScaleProps {
  label?: React.ReactNode;
  value?: number;
  max?: number;
  onChange?: (value: number) => void;
  style?: React.CSSProperties;
}

export function RatingScale(props: RatingScaleProps): JSX.Element;
