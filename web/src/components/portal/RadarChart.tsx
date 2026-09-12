export type RadarAxe = { label: string; value: number; max: number; couleur?: string };

const ANNEAUX = [0.25, 0.5, 0.75, 1];

function point(cx: number, cy: number, rayon: number, i: number, n: number, fraction: number) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return { x: cx + fraction * rayon * Math.cos(angle), y: cy + fraction * rayon * Math.sin(angle) };
}

// Radar/spider chart minimaliste en SVG — pas de librairie externe, juste
// de la trigonométrie. Chaque axe a son propre max (les échelles diffèrent
// : /5 pour une note technique, /100 pour un %, un plafond souple pour les
// points FFN) mais est tracé à sa fraction (valeur/max), donc toutes les
// pointes restent comparables visuellement.
export function RadarChart({ axes, size = 260, color = "#1E7BFF" }: { axes: RadarAxe[]; size?: number; color?: string }) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const rayon = size / 2 - 34;

  const polygonPoints = axes.map((a, i) => point(cx, cy, rayon, i, n, Math.max(0, Math.min(1, a.value / a.max))));
  const polygonStr = polygonPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {ANNEAUX.map((f) => {
        const pts = Array.from({ length: n }, (_, i) => point(cx, cy, rayon, i, n, f));
        return <polygon key={f} points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />;
      })}
      {axes.map((_, i) => {
        const p = point(cx, cy, rayon, i, n, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />;
      })}
      <polygon points={polygonStr} fill={`${color}33`} stroke={color} strokeWidth={2} />
      {polygonPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}
      {axes.map((a, i) => {
        const p = point(cx, cy, rayon, i, n, 1.22);
        return (
          <text key={a.label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={600} fill="var(--ink-body)">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
