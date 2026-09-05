import React from 'react';

export function RatingScale({ label, value, max = 5, onChange, style }) {
  const notes = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', ...style }}>
      <div style={{ font: 'var(--body-strong)' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + max + ',1fr)', gap: '7px' }}>
        {notes.map(n => {
          const on = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange && onChange(n)}
              style={{
                height: 'var(--tap-min)',
                borderRadius: 'var(--r-l)',
                border: '1px solid ' + (on ? 'var(--cyan)' : 'var(--border-strong)'),
                background: on ? 'rgba(36,200,255,0.20)' : 'var(--veil-2)',
                color: on ? 'var(--ink)' : 'var(--ink-3)',
                font: 'var(--metric-s)',
                cursor: 'pointer'
              }}
            >{n}</button>
          );
        })}
      </div>
    </div>
  );
}
