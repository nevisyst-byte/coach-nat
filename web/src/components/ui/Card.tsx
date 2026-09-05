export function Card({
  children,
  className = "",
  padding = 20,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", padding, ...style }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between mb-4 gap-2.5 flex-wrap">
      <h2 className="font-display text-[19px] tracking-[0.06em]">{children}</h2>
      {right && (
        <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
          {right}
        </span>
      )}
    </div>
  );
}

export function ProgressBar({ value, color, height = 9 }: { value: number; color: string; height?: number }) {
  return (
    <div className="rounded-md overflow-hidden" style={{ height, background: "rgba(255,255,255,0.07)" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, value))}%`, borderRadius: 6, background: color }} />
    </div>
  );
}

export function Chip({
  active,
  color = "#1E7BFF",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean; color?: string }) {
  return (
    <button
      {...rest}
      className={`rounded-[9px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer ${rest.className ?? ""}`}
      style={{
        border: `1px solid ${active ? color : "var(--border-strong)"}`,
        background: active ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)",
        color: active ? "var(--ink)" : "var(--ink-body)",
      }}
    >
      {children}
    </button>
  );
}
