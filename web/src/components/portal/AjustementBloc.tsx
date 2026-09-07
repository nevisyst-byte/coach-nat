"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AjustementBloc({
  planId,
  groupeId,
  date,
  sectionId,
  pourcentageActuel,
}: {
  planId: string;
  groupeId: string;
  date: string;
  sectionId: string;
  pourcentageActuel: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [valeur, setValeur] = useState(pourcentageActuel ?? 0);
  const [saving, setSaving] = useState(false);

  async function enregistrer() {
    setSaving(true);
    try {
      await fetch(`/api/plans-entrainement/${planId}/ajustements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupeId, date, sectionId, pourcentage: valeur }),
      });
      router.refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start shrink-0 text-[11px] font-semibold cursor-pointer rounded-[8px] px-2.5 py-1.5"
        style={{
          color: pourcentageActuel ? "#F2B33D" : "var(--ink-secondary)",
          border: `1px solid ${pourcentageActuel ? "rgba(242,179,61,0.4)" : "var(--border-strong)"}`,
          background: pourcentageActuel ? "rgba(242,179,61,0.08)" : "transparent",
        }}
        title="Ajuster ce bloc pour cette date uniquement"
      >
        {pourcentageActuel ? `${pourcentageActuel > 0 ? "+" : ""}${pourcentageActuel}%` : "± ajuster"}
      </button>
    );
  }

  return (
    <div className="self-start shrink-0 flex items-center gap-1.5 rounded-[8px] px-2 py-1.5" style={{ border: "1px solid var(--border-strong)", background: "rgba(255,255,255,0.04)" }}>
      <input
        type="number"
        value={valeur}
        onChange={(e) => setValeur(parseInt(e.target.value, 10) || 0)}
        className="w-14 text-sm text-center outline-none rounded-[6px] py-1"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--ink)" }}
      />
      <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
        %
      </span>
      <button onClick={enregistrer} disabled={saving} className="text-xs font-bold cursor-pointer" style={{ color: "#24C8FF" }}>
        {saving ? "…" : "OK"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs cursor-pointer" style={{ color: "var(--ink-muted)" }}>
        ✕
      </button>
    </div>
  );
}
