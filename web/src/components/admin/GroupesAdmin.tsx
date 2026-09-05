"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Groupe = { id: string; nom: string; pole: string; categorie: string; color: string; objectif: string | null; coachId: string | null };
type Coach = { id: string; nom: string };

const POLES = ["FORMATION", "COMPETITION", "SAUVETAGE", "LOISIR"];

export function GroupesAdmin({ groupes, coachs }: { groupes: Groupe[]; coachs: Coach[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ nom: "", pole: "COMPETITION", categorie: "", color: "#1E7BFF", objectif: "", coachId: "" });
  const [saving, setSaving] = useState(false);

  async function createGroupe(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/admin/groupes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, coachId: form.coachId || null }),
      });
      setForm({ nom: "", pole: "COMPETITION", categorie: "", color: "#1E7BFF", objectif: "", coachId: "" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function updateGroupe(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/groupes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    router.refresh();
  }

  async function removeGroupe(id: string) {
    await fetch(`/api/admin/groupes/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={createGroupe} className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <input required placeholder="Nom du groupe" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
        <select value={form.pole} onChange={(e) => setForm((f) => ({ ...f, pole: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
          {POLES.map((p) => (
            <option key={p} value={p} style={{ background: "#101A2B" }}>
              {p}
            </option>
          ))}
        </select>
        <input required placeholder="Catégorie" value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
        <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="rounded-[9px] h-[42px] cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }} />
        <select value={form.coachId} onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
          <option value="" style={{ background: "#101A2B" }}>
            — coach —
          </option>
          {coachs.map((c) => (
            <option key={c.id} value={c.id} style={{ background: "#101A2B" }}>
              {c.nom}
            </option>
          ))}
        </select>
        <input placeholder="Objectif en cours" value={form.objectif} onChange={(e) => setForm((f) => ({ ...f, objectif: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
        <button type="submit" disabled={saving} className="rounded-[9px] px-4 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Création…" : "Créer le groupe"}
        </button>
      </form>

      <div className="flex flex-col gap-2.5">
        {groupes.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3 flex-wrap" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${g.color}` }}>
            <div style={{ minWidth: 160 }}>
              <div className="text-sm font-semibold">{g.nom}</div>
              <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                {g.pole} · {g.categorie}
              </div>
            </div>
            <select
              defaultValue={g.coachId ?? ""}
              onChange={(e) => updateGroupe(g.id, { coachId: e.target.value || null })}
              className="rounded-[9px] px-2.5 py-2 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
            >
              <option value="" style={{ background: "#101A2B" }}>
                — coach —
              </option>
              {coachs.map((c) => (
                <option key={c.id} value={c.id} style={{ background: "#101A2B" }}>
                  {c.nom}
                </option>
              ))}
            </select>
            <input
              defaultValue={g.objectif ?? ""}
              onBlur={(e) => updateGroupe(g.id, { objectif: e.target.value })}
              placeholder="Objectif en cours"
              className="flex-1 rounded-[9px] px-2.5 py-2 text-sm outline-none"
              style={{ minWidth: 160, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
            />
            <button onClick={() => removeGroupe(g.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
