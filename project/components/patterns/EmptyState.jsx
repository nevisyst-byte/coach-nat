import React from 'react';

export function EmptyState({ title, hint, action, compact = false, style }) {
  return (
    <div style={{
      padding: compact ? '22px' : '56px 24px',
      textAlign: 'center',
      border: compact ? '1px dashed var(--border-strong)' : undefined,
      borderRadius: compact ? 'var(--r-l)' : undefined,
      ...style
    }}>
      <div style={{
        font: 'var(--display-3)', letterSpacing: '0.04em',
        textTransform: 'uppercase', color: 'var(--ink-2)'
      }}>{title}</div>
      {hint ? <div style={{ font: 'var(--body-s)', color: 'var(--ink-3)', marginTop: '6px' }}>{hint}</div> : null}
      {action ? <div style={{ marginTop: '18px' }}>{action}</div> : null}
    </div>
  );
}
