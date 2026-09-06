"use client";

import { useState, type ReactNode } from "react";

const TABS = ["Vue d'ensemble", "Semaine type", "Vacances & stages", "Dates spécifiques"];

export function CalendrierClient({
  vueEnsemble,
  semaineType,
  vacances,
  datesSpecifiques,
}: {
  vueEnsemble: ReactNode;
  semaineType: ReactNode;
  vacances: ReactNode;
  datesSpecifiques: ReactNode;
}) {
  const [tab, setTab] = useState(0);
  const panels = [vueEnsemble, semaineType, vacances, datesSpecifiques];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className="rounded-[10px] px-4 py-2 text-[13px] font-semibold cursor-pointer"
            style={{
              border: `1px solid ${tab === i ? "#1E7BFF" : "var(--border-strong)"}`,
              background: tab === i ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)",
              color: tab === i ? "var(--ink)" : "var(--ink-body)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {panels[tab]}
    </div>
  );
}
