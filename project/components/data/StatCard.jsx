import React from 'react';

export function StatCard({ value, label, icon, delta, deltaTone = 'ok', accent = 'blue', style }) {
  const ring = accent === 'red'
    ? { bg: 'rgba(232,68,43,0.14)', bd: 'rgba(232,68,43,0.30)' }
    : { bg: 'rgba(30,123,255,0.14)', bd: 'rgba(30,123,255,0.30)' };
  const tones = { ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)', neutral: 'var(--ink-3)' };
  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--bg-card-raised), #0C1524)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-xl)',
      padding: '18px 20px',
      ...style
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {icon ? (
          <div style={{
            width: '36px', height: '36px', borderRadius: 'var(--r-m)',
            background: ring.bg, border: '1px solid ' + ring.bd,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
          }}>{icon}</div>
        ) : <span />}
        {delta ? (
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: tones[deltaTone] }}>{delta}</div>
        ) : null}
      </div>
      <div style={{ font: 'var(--metric-xl)', marginTop: '14px' }}>{value}</div>
      <div style={{ font: 'var(--body-s)', color: 'var(--ink-3)', marginTop: '4px' }}>{label}</div>
    </div>
  );
}
