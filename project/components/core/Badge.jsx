import React from 'react';

const TONES = {
  ok: { bg: 'var(--ok-bg)', fg: 'var(--ok)' },
  warn: { bg: 'var(--warn-bg)', fg: 'var(--warn)' },
  danger: { bg: 'var(--danger-bg)', fg: 'var(--danger)' },
  info: { bg: 'var(--info-bg)', fg: 'var(--blue-ink)' },
  neutral: { bg: 'var(--neutral-bg)', fg: 'var(--ink-2)' }
};

export function Badge({ children, tone = 'neutral', dot = false, style }) {
  const t = TONES[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--font-ui)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: 'var(--track-label)',
        textTransform: 'uppercase',
        padding: '5px 10px',
        borderRadius: 'var(--r-xs)',
        background: t.bg,
        color: t.fg,
        ...style
      }}
    >
      {dot ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: t.fg }} /> : null}
      {children}
    </span>
  );
}
