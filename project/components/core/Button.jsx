import React from 'react';

const BASE = {
  fontFamily: 'var(--font-ui)',
  fontWeight: 700,
  cursor: 'pointer',
  border: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  whiteSpace: 'nowrap',
  transition: 'background-color .14s ease, border-color .14s ease, color .14s ease, filter .14s ease'
};

const SIZES = {
  s: { minHeight: '34px', padding: '0 13px', fontSize: '12px', borderRadius: 'var(--r-s)' },
  m: { minHeight: '40px', padding: '0 18px', fontSize: '13px', borderRadius: 'var(--r-m)' },
  l: { minHeight: '46px', padding: '0 22px', fontSize: '14px', borderRadius: 'var(--r-l)' }
};

const VARIANTS = {
  primary: { background: 'var(--grad-primary)', color: '#fff' },
  danger: { background: 'var(--grad-danger)', color: '#fff' },
  secondary: { background: 'var(--veil-3)', color: 'var(--ink)', border: '1px solid var(--border-strong)' },
  ghost: { background: 'transparent', color: 'var(--ink-2)', border: '1px solid var(--border)' },
  quiet: { background: 'var(--info-bg)', color: 'var(--blue-ink)', border: '1px solid rgba(30,123,255,0.4)' },
  dashed: { background: 'transparent', color: 'var(--ink-2)', border: '1px dashed var(--border-strong)' }
};

export function Button({
  children, variant = 'primary', size = 'm', icon, block = false,
  disabled = false, onClick, title, style
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...BASE, ...SIZES[size], ...VARIANTS[variant],
        width: block ? '100%' : undefined,
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? 'none' : undefined,
        ...style
      }}
    >
      {icon ? <span style={{ fontSize: '14px', lineHeight: 1 }}>{icon}</span> : null}
      {children}
    </button>
  );
}
