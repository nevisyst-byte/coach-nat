import React from 'react';

export function Chip({ children, selected = false, accent, onClick, disabled = false, style }) {
  const color = accent || 'var(--cyan)';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '13px',
        fontWeight: 600,
        minHeight: '40px',
        padding: '0 15px',
        borderRadius: 'var(--r-m)',
        cursor: 'pointer',
        border: '1px solid ' + (selected ? color : 'var(--border-strong)'),
        background: selected ? 'rgba(30,123,255,0.20)' : 'var(--veil-2)',
        color: selected ? 'var(--ink)' : 'var(--ink-2)',
        opacity: disabled ? 0.4 : 1,
        transition: 'background-color .14s ease, border-color .14s ease, color .14s ease',
        ...style
      }}
    >
      {children}
    </button>
  );
}
