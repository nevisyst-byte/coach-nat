import React from 'react';

const TONES = { ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)' };

export function SlotCard({ state, stateTone = 'ok', group, coach, facts = [], onClick, actions, style }) {
  const tone = TONES[stateTone];
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: 'var(--accent-bar) solid ' + tone,
        borderRadius: 'var(--r-l)',
        padding: 'var(--sp-5)',
        cursor: onClick ? 'pointer' : undefined,
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: tone, flex: '0 0 auto' }} />
        <span style={{
          font: 'var(--label-xs)', letterSpacing: '0.1em',
          textTransform: 'uppercase', color: tone
        }}>{state}</span>
      </div>
      <div style={{ marginTop: '10px', font: 'var(--body-l)', fontWeight: 600, lineHeight: 1.3 }}>{group}</div>
      <div style={{ marginTop: '3px', font: 'var(--body-s)', color: 'var(--ink)' }}>{coach}</div>
      {facts.length ? (
        <div style={{
          marginTop: '11px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexWrap: 'wrap', columnGap: '8px', rowGap: '3px',
          font: 'var(--label)', fontWeight: 400, color: 'var(--ink-4)'
        }}>
          {facts.map((f, i) => (
            <React.Fragment key={f}>
              {i > 0 ? <span>·</span> : null}
              <span>{f}</span>
            </React.Fragment>
          ))}
        </div>
      ) : null}
      {actions ? <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>{actions}</div> : null}
    </div>
  );
}
