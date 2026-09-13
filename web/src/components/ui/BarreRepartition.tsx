"use client";

import { useRef } from "react";
import type { ValeurPourcentage } from "@/lib/seance-generator";

export const PALETTE = ["#1E7BFF", "#24C8FF", "#2ECC8F", "#F2B33D", "#E8442B", "#8C6BFF", "#5B7BA6"];

// Coche/décoche une valeur en redistribuant tout de suite un % égal entre
// les valeurs cochées — immédiatement utilisable, l'utilisateur affine
// ensuite en glissant les poignées de BarreRepartition. Partagé par tous
// les endroits où une même case (répartition de plan, série manuelle...)
// accepte plusieurs valeurs pondérées pour un même axe.
export function repartirEgal(valeurs: string[]): ValeurPourcentage[] {
  const part = Math.round(100 / valeurs.length);
  return valeurs.map((valeur, i) => ({ valeur, pourcentage: i === valeurs.length - 1 ? 100 - part * (valeurs.length - 1) : part }));
}

export function sommeRepartition(valeurs: ValeurPourcentage[]) {
  return valeurs.reduce((s, v) => s + (v.pourcentage || 0), 0);
}

// Barre à 100% divisée en un segment par valeur cochée — on glisse la
// poignée entre deux segments pour rééquilibrer leurs deux %, le reste ne
// bouge pas. La somme reste donc toujours exactement 100 par construction,
// sans validation à afficher : plus direct que taper un nombre par valeur.
export function BarreRepartition({ valeurs, onChange }: { valeurs: ValeurPourcentage[]; onChange: (valeurs: ValeurPourcentage[]) => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ index: number; startX: number; startA: number; startB: number; base: ValeurPourcentage[] } | null>(null);

  function onHandleDown(e: React.MouseEvent, index: number) {
    e.preventDefault();
    dragRef.current = { index, startX: e.clientX, startA: valeurs[index].pourcentage, startB: valeurs[index + 1].pourcentage, base: valeurs };

    function onMove(ev: MouseEvent) {
      const info = dragRef.current;
      const largeur = barRef.current?.getBoundingClientRect().width;
      if (!info || !largeur) return;
      const total = info.startA + info.startB;
      const deltaPct = ((ev.clientX - info.startX) / largeur) * 100;
      const a = Math.max(1, Math.min(total - 1, Math.round(info.startA + deltaPct)));
      const b = total - a;
      onChange(info.base.map((v, i) => (i === info.index ? { ...v, pourcentage: a } : i === info.index + 1 ? { ...v, pourcentage: b } : v)));
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div ref={barRef} className="flex w-full rounded-lg overflow-hidden select-none" style={{ height: 32 }}>
      {valeurs.map((v, i) => (
        <div
          key={v.valeur}
          className="relative flex items-center justify-center"
          style={{ width: `${v.pourcentage}%`, minWidth: 0, background: PALETTE[i % PALETTE.length], borderRight: i < valeurs.length - 1 ? "1px solid rgba(0,0,0,0.35)" : undefined }}
        >
          <span className="truncate px-1 text-[11px] font-semibold text-white" style={{ maxWidth: "100%", overflow: "hidden" }}>
            {v.valeur} · {v.pourcentage}%
          </span>
          {i < valeurs.length - 1 && (
            <div onMouseDown={(e) => onHandleDown(e, i)} className="absolute top-0 h-full z-10" style={{ right: -6, width: 12, cursor: "col-resize" }} />
          )}
        </div>
      ))}
    </div>
  );
}
