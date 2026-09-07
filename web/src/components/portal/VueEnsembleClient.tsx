"use client";

import { useState } from "react";
import Link from "next/link";
import { ETAT_COLOR, ETAT_LABEL } from "@/lib/format";
import { disposerParColonnes } from "@/lib/disposition-horaire";

export type EvenementDetail = {
  kind: "reg" | "stage";
  id: string;
  debut: string;
  fin: string;
  debutMin: number;
  finMin: number;
  groupeNom: string;
  coachNom: string | null;
  bassin: string;
  etat?: string;
  enPause?: boolean;
  stageNom?: string;
  stageColor?: string;
  presenceHref: string;
};

export type JourDetail = {
  n: number;
  dateIso: string;
  evenements: EvenementDetail[];
  echeances: { titre: string; detail: string; color: string }[];
};

const PX_PAR_MIN = 1.7;

export function VueEnsembleClient({ mois, annee, cells, aujourdhui }: { mois: string; annee: number; cells: (JourDetail | null)[]; aujourdhui: number }) {
  const [selected, setSelected] = useState<JourDetail | null>(null);

  const debuts = selected ? selected.evenements.map((e) => e.debutMin) : [];
  const fins = selected ? selected.evenements.map((e) => e.finMin) : [];
  const rangeDebut = debuts.length ? Math.floor(Math.min(...debuts) / 60) * 60 : 16 * 60;
  const rangeFin = fins.length ? Math.ceil(Math.max(...fins) / 60) * 60 : 21 * 60;
  const hauteur = (rangeFin - rangeDebut) * PX_PAR_MIN;
  const heures = Array.from({ length: (rangeFin - rangeDebut) / 60 + 1 }, (_, k) => rangeDebut / 60 + k);
  const disposition = selected ? disposerParColonnes(selected.evenements) : [];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-[19px] tracking-[0.06em]">
          {mois} {annee}
        </h2>
        <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
          Séances · échéances
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-[11px] uppercase tracking-[0.08em] mb-1.5 text-center" style={{ color: "#61789B" }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => {
          const isToday = c?.n === aujourdhui;
          const badges = c ? [...c.evenements.map((e) => ({ label: e.groupeNom, color: e.kind === "stage" ? (e.stageColor ?? "#8C6BFF") : ETAT_COLOR[e.etat ?? "ASSURE"] })), ...c.echeances.map((e) => ({ label: e.titre, color: e.color }))] : [];
          return (
            <button
              key={i}
              onClick={() => c && setSelected(c)}
              disabled={!c}
              className="rounded-[9px] p-1.5 flex flex-col gap-0.5 text-left"
              style={{
                minHeight: 74,
                border: `1px solid ${isToday ? "#24C8FF" : "var(--border)"}`,
                background: isToday ? "rgba(30,123,255,0.22)" : c ? "rgba(255,255,255,0.03)" : "transparent",
                cursor: c ? "pointer" : "default",
              }}
            >
              {c && (
                <>
                  <span className="text-xs font-semibold" style={{ color: isToday ? "var(--ink)" : "var(--ink-body)" }}>
                    {c.n}
                  </span>
                  {badges.slice(0, 3).map((e, j) => (
                    <span
                      key={j}
                      className="text-[9px] font-bold leading-tight px-1 py-0.5 rounded whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ background: "rgba(255,255,255,0.08)", color: e.color }}
                    >
                      {e.label}
                    </span>
                  ))}
                </>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 480, maxHeight: "85vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[19px] tracking-[0.05em]">
                {selected.n} {mois}
              </h2>
              <button onClick={() => setSelected(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto flex flex-col gap-3">
              {selected.echeances.map((e, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `3px solid ${e.color}` }}>
                  <span className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: e.color }}>
                    Échéance
                  </span>
                  <span className="text-sm font-semibold">{e.titre}</span>
                  {e.detail && (
                    <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                      · {e.detail}
                    </span>
                  )}
                </div>
              ))}

              {selected.evenements.length === 0 ? (
                <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Aucun créneau ce jour-là.
                </div>
              ) : (
                <div className="relative rounded-[11px]" style={{ height: hauteur, background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                  {heures.map((h) => (
                    <div key={h} className="absolute left-0 right-0 flex items-center gap-2" style={{ top: (h * 60 - rangeDebut) * PX_PAR_MIN }}>
                      <span className="text-[10px] pl-1.5 shrink-0" style={{ color: "#61789B", width: 34 }}>
                        {String(Math.floor(h) % 24).padStart(2, "0")}:00
                      </span>
                      <div className="flex-1" style={{ borderTop: "1px solid var(--border)", opacity: 0.6 }} />
                    </div>
                  ))}
                  {disposition.map((e) => {
                    const top = (e.debutMin - rangeDebut) * PX_PAR_MIN;
                    const h = Math.max((e.finMin - e.debutMin) * PX_PAR_MIN, 40);
                    const largeurPct = 100 / e.nbCols;
                    const compact = h < 70;
                    const couleur = e.kind === "stage" ? (e.stageColor ?? "#8C6BFF") : ETAT_COLOR[e.etat ?? "ASSURE"];
                    return (
                      <Link
                        key={e.id}
                        href={e.presenceHref}
                        className="absolute rounded-[8px] px-2 py-1.5 overflow-hidden transition-colors hover:brightness-110"
                        style={{
                          top,
                          height: h,
                          left: `calc(38px + ${e.col * largeurPct}%)`,
                          width: `calc(${largeurPct}% - 42px)`,
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderLeft: `3px solid ${couleur}`,
                          opacity: e.enPause ? 0.5 : 1,
                        }}
                        title={`${e.groupeNom} · ${e.debut}–${e.fin} · ${e.coachNom ?? "—"}`}
                      >
                        <div className="text-[12px] font-semibold truncate leading-tight">{e.groupeNom}</div>
                        <div className="text-[10px] truncate" style={{ color: "#7D91AE" }}>
                          {e.debut}–{e.fin}
                          {!compact && ` · ${e.coachNom ?? "—"}`}
                        </div>
                        {!compact && e.kind === "reg" && (
                          <div className="text-[9px] font-bold mt-0.5" style={{ color: couleur }}>
                            {e.enPause ? "En pause" : ETAT_LABEL[e.etat ?? "ASSURE"]}
                          </div>
                        )}
                        {!compact && e.kind === "stage" && (
                          <div className="text-[9px] font-bold mt-0.5 truncate" style={{ color: couleur }}>
                            Stage · {e.stageNom}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
