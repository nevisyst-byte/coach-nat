import React from 'react';

export function MeterBar({ label, value, meta, pct, color = 'var(--blue)', compact = false, style }) {
  return (
    <div style={style}>
      {(label || meta) && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          font: 'var(--body-xs)', marginBottom: '5px'
        }}>
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
          <span style={{ color: 'var(--ink-3)' }}>{meta}</span>
        </div>
      )}
      <div style={{
        height: compact ? 'var(--bar-h-s)' : 'var(--bar-h)',
        borderRadius: 'var(--bar-r)',
        background: 'rgba(255,255,255,0.07)',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%', width: pct, maxWidth: '100%',
          borderRadius: 'var(--bar-r)', background: color
        }} />
      </div>
      {value ? <div style={{ font: 'var(--body-xs)', color: 'var(--ink-3)', marginTop: '4px' }}>{value}</div> : null}
    </div>
  );
}
