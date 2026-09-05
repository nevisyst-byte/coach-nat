import React from 'react';

export function PersonRow({ initials, name, meta, avatarTone = 'blue', right, onClick, style }) {
  const tones = {
    blue: 'rgba(30,123,255,0.22)',
    red: 'rgba(232,68,43,0.22)',
    neutral: 'var(--veil-4)'
  };
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        padding: '11px 13px', borderRadius: 'var(--r-l)',
        background: 'var(--veil-1)', border: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : undefined,
        ...style
      }}
    >
      <div style={{
        width: '34px', height: '34px', borderRadius: 'var(--r-s)',
        background: tones[avatarTone], display: 'flex', alignItems: 'center',
        justifyContent: 'center', font: 'var(--label)', fontWeight: 700, flex: '0 0 auto'
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: '110px' }}>
        <div style={{ font: 'var(--body-strong)' }}>{name}</div>
        <div style={{ font: 'var(--label)', fontWeight: 400, color: 'var(--ink-3)' }}>{meta}</div>
      </div>
      {right}
    </div>
  );
}
