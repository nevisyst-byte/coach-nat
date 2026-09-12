export type CamembertItem = { nom: string; m: number; color: string };

export function donutCss(items: { m: number; color: string }[]) {
  const total = items.reduce((a, r) => a + r.m, 0);
  let acc = 0;
  const stops = items
    .map((r) => {
      const from = (acc / total) * 360;
      acc += r.m;
      return `${r.color} ${from.toFixed(1)}deg ${((acc / total) * 360).toFixed(1)}deg`;
    })
    .join(", ");
  return { total, css: `conic-gradient(${stops})` };
}

const defautFormatTotal = (total: number) => `${(total / 1000).toFixed(1).replace(".", ",")} km`;
const defautFormatValeur = (m: number) => `${(m / 1000).toFixed(1).replace(".", ",")} km`;

// Camembert générique (dégradé conique CSS) réutilisé pour le volume par
// nage/intensité/variant — sur le tableau de bord coach (volume réel des
// créneaux) comme sur l'aperçu d'un plan (% cible saisis à la création).
export function Camembert({
  titre,
  items,
  totalLabel = "nagés",
  formatTotal = defautFormatTotal,
  formatValeur = defautFormatValeur,
}: {
  titre: string;
  items: CamembertItem[];
  totalLabel?: string;
  formatTotal?: (total: number) => string;
  formatValeur?: (m: number, total: number) => string;
}) {
  if (items.length === 0) return null;
  const { total, css } = donutCss(items);
  return (
    <div>
      <div className="text-[12px] tracking-[0.14em] uppercase mb-3.5" style={{ color: "var(--ink-tertiary)" }}>
        {titre}
      </div>
      <div className="flex items-center gap-5 flex-wrap">
        <div className="relative w-[132px] h-[132px] shrink-0">
          <div className="absolute inset-0 rounded-full" style={{ background: css }} />
          <div className="absolute inset-[27px] rounded-full flex flex-col items-center justify-center" style={{ background: "var(--bg-card)" }}>
            <span className="font-display text-[19px] leading-none">{formatTotal(total)}</span>
            <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-tertiary)" }}>
              {totalLabel}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1" style={{ minWidth: 132 }}>
          {items.map((r) => (
            <div key={r.nom} className="flex items-center gap-2 text-[13px]">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.color }} />
              <span className="flex-1 font-semibold">{r.nom}</span>
              <span style={{ color: "var(--ink-secondary)" }}>{formatValeur(r.m, total)}</span>
              <span className="font-bold" style={{ minWidth: 34, textAlign: "right" }}>
                {Math.round((r.m / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
