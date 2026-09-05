"use client";

import { useRouter } from "next/navigation";

type Row = { id: string; nom: string; pole: string; count: number };

export function EffectifsAdmin({ rows }: { rows: Row[] }) {
  const router = useRouter();

  async function update(id: string, count: number) {
    await fetch(`/api/admin/effectifs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count }) });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
          <div className="flex-1" style={{ minWidth: 140 }}>
            <div className="text-sm font-semibold">{r.nom}</div>
            <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
              {r.pole}
            </div>
          </div>
          <input
            type="number"
            defaultValue={r.count}
            onBlur={(e) => update(r.id, parseInt(e.target.value, 10) || 0)}
            className="rounded-[9px] px-3 py-2 text-sm outline-none"
            style={{ width: 100, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
          />
        </div>
      ))}
    </div>
  );
}
