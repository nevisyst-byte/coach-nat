import React from 'react';

export function Donut({ slices = [], centerValue, centerLabel, size = 132, ring = 27, style }) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  const stops = slices.map(s => {
    const from = (acc / total) * 360;
    acc += s.value;
    return s.color + ' ' + from.toFixed(1) + 'deg ' + ((acc / total) * 360).toFixed(1) + 'deg';
  }).join(', ');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', ...style }}>
      <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(' + stops + ')' }} />
        <div style={{
          position: 'absolute', inset: ring, borderRadius: '50%', background: 'var(--bg-card)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ font: 'var(--metric-s)', color: 'var(--ink)' }}>{centerValue}</span>
          {centerLabel ? (
            <span style={{ font: 'var(--label-xs)', letterSpacing: 'var(--track-label)', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{centerLabel}</span>
          ) : null}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '132px' }}>
        {slices.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '9px', font: 'var(--body-xs)' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color, flex: '0 0 auto' }} />
            <span style={{ flex: 1, fontWeight: 600 }}>{s.label}</span>
            {s.meta ? <span style={{ color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{s.meta}</span> : null}
            <span style={{ fontWeight: 700, minWidth: '34px', textAlign: 'right' }}>{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
