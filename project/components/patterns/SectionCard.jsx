import React from 'react';

export function SectionCard({ title, meta, actions, children, accent, style }) {
  return (
    <section style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderTop: accent ? '3px solid ' + accent : undefined,
      borderRadius: 'var(--r-2xl)',
      padding: 'var(--pad-card)',
      ...style
    }}>
      {(title || meta || actions) && (
        <header style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: '14px', flexWrap: 'wrap', marginBottom: 'var(--sp-6)'
        }}>
          <h2 style={{
            margin: 0, font: 'var(--display-4)',
            letterSpacing: 'var(--track-title)', textTransform: 'uppercase'
          }}>{title}</h2>
          {meta ? <span style={{ font: 'var(--body-xs)', color: 'var(--ink-3)' }}>{meta}</span> : null}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
