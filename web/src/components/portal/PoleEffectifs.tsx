"use client";

import { useState } from "react";
import { ProgressBar } from "@/components/ui/Card";
import { POLE_LABELS } from "@/lib/theme";

type Cat = { nom: string; n: number };
type PoleData = { pole: string; color: string; total: number; part: number; cats: Cat[] };

export function PoleEffectifs({ poles }: { poles: PoleData[] }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const maxCat = Math.max(1, ...poles.flatMap((p) => p.cats.map((c) => c.n)));

  return (
    <>
      <div className="flex h-3.5 rounded-lg overflow-hidden mb-4" style={{ border: "1px solid var(--border-strong)" }}>
        {poles.map((p) => (
          <div key={p.pole} title={`${POLE_LABELS[p.pole]} · ${p.total}`} style={{ width: `${p.part}%`, background: p.color }} />
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {poles.map((p) => {
          const open = ouvert === p.pole;
          return (
            <div key={p.pole} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${open ? p.color : "var(--border)"}` }}>
              <button
                onClick={() => setOuvert(open ? null : p.pole)}
                className="w-full flex items-center gap-3 text-left cursor-pointer px-3.5 py-3"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <span className="w-[9px] h-[26px] rounded shrink-0" style={{ background: p.color }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">{POLE_LABELS[p.pole]}</span>
                  <span className="block text-[11px]" style={{ color: "var(--ink-secondary)" }}>
                    {p.cats.length} catégories
                  </span>
                </span>
                <span className="font-display text-2xl">{p.total}</span>
                <span className="text-xs font-bold min-w-[38px] text-right" style={{ color: p.color }}>
                  {p.part}%
                </span>
                <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                  {open ? "▾" : "▸"}
                </span>
              </button>
              {open && (
                <div className="flex flex-col gap-2.5 p-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                  {p.cats
                    .slice()
                    .sort((a, b) => b.n - a.n)
                    .map((c) => (
                      <div key={c.nom} className="flex items-center gap-3">
                        <span className="text-xs shrink-0" style={{ width: 118, color: "var(--ink-body)" }}>
                          {c.nom}
                        </span>
                        <span className="flex-1">
                          <ProgressBar value={(c.n / maxCat) * 100} color={p.color} height={8} />
                        </span>
                        <span className="text-xs font-bold shrink-0" style={{ width: 26, textAlign: "right" }}>
                          {c.n}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
