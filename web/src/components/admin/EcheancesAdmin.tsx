"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Echeance = { id: string; date: string; titre: string; detail: string; color: string };

export function EcheancesAdmin({ echeances }: { echeances: Echeance[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ date: "", titre: "", detail: "", color: "#1E7BFF" });
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/admin/echeances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm({ date: "", titre: "", detail: "", color: "#1E7BFF" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/echeances/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={create} className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
        <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
        <input required placeholder="Titre" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
        <input placeholder="Détail" value={form.detail} onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
        <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="rounded-[9px] h-[42px] cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }} />
        <button type="submit" disabled={saving} className="rounded-[9px] px-4 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Ajout…" : "Ajouter"}
        </button>
      </form>

      <div className="flex flex-col gap-2.5">
        {echeances.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${e.color}` }}>
            <div className="text-sm font-semibold" style={{ minWidth: 100 }}>
              {new Date(e.date).toLocaleDateString("fr-FR")}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{e.titre}</div>
              <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                {e.detail}
              </div>
            </div>
            <button onClick={() => remove(e.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
