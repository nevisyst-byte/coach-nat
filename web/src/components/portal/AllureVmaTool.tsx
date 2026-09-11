"use client";

import { useState } from "react";
import { typesDisponibles, allureCible, parseMmSs, fmtMmSs } from "@/lib/allure-vma";

const DISTANCES = ["50", "100", "200", "400"] as const;

// Outil de conversion temps test (100m nage complète) -> allures cibles par
// type d'entraînement, à partir des grilles du coach. Réutilisé sur la
// fiche nageur et depuis le générateur de séance.
export function AllureVmaTool() {
  const [testInput, setTestInput] = useState("5:30");
  const testSec = parseMmSs(testInput);
  const types = testSec !== null ? typesDisponibles(testSec) : [];
  const [type, setType] = useState<string | null>(null);
  const typeActif = type && types.includes(type) ? type : types[0] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] tracking-[0.1em] uppercase" style={{ color: "#61789B" }}>
          Temps test 100m nage complète
        </span>
        <input
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder="5:30"
          className="rounded-[9px] px-3 py-1.5 text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)", width: 90 }}
        />
        {testSec === null && testInput.trim() !== "" && (
          <span className="text-[11px]" style={{ color: "#FF9179" }}>
            Format attendu : m:ss (ex. 5:30)
          </span>
        )}
      </div>

      {testSec !== null && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="rounded-full px-3 py-1 text-[12px] font-semibold cursor-pointer"
                style={{
                  background: typeActif === t ? "linear-gradient(135deg,#1E7BFF,#0F5FD6)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${typeActif === t ? "transparent" : "var(--border)"}`,
                  color: typeActif === t ? "#fff" : "var(--ink-body)",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {typeActif &&
            (() => {
              const cible = allureCible(testSec, typeActif);
              if (!cible) return null;
              return (
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
                  {DISTANCES.map((d) => (
                    <div key={d} className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                      <div className="text-[10px] tracking-[0.1em] uppercase" style={{ color: "#61789B" }}>
                        {d} m
                      </div>
                      <div className="font-display text-lg mt-0.5">{fmtMmSs(cible[d])}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          <div className="text-[11px]" style={{ color: "#61789B" }}>
            {testSec <= 360
              ? "Test ≤ 6:00 → types d'allure (nageurs rapides)."
              : "Test > 6:00 → niveaux (nageurs en développement)."}{" "}
            Hors plage 4:00–7:30, l&apos;allure la plus proche est utilisée.
          </div>
        </>
      )}
    </div>
  );
}
