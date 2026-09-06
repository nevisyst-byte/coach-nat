"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Nageur = { id: string; nom: string; age: number; categorie: string; specialite: string; groupeId: string | null; pointsFFN: number; presenceRate: number; membreDepuis: string | null };
type Groupe = { id: string; nom: string };

export function NageursAdmin({ nageurs, groupes }: { nageurs: Nageur[]; groupes: Groupe[] }) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({ nom: "", anneeNaissance: "", categorie: "", specialite: "", groupeId: "", membreDepuis: "" });
  const [saving, setSaving] = useState(false);

  async function createNageur(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/admin/nageurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, anneeNaissance: parseInt(form.anneeNaissance, 10) || currentYear - 14, groupeId: form.groupeId || null, membreDepuis: form.membreDepuis || null }),
      });
      setForm({ nom: "", anneeNaissance: "", categorie: "", specialite: "", groupeId: "", membreDepuis: "" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/nageurs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/nageurs/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={createNageur} className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
        <input required placeholder="Nom complet" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
        <input required type="number" placeholder={`Année de naissance (ex. ${currentYear - 12})`} value={form.anneeNaissance} onChange={(e) => setForm((f) => ({ ...f, anneeNaissance: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
        <input required placeholder="Catégorie" value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
        <input required placeholder="Spécialité" value={form.specialite} onChange={(e) => setForm((f) => ({ ...f, specialite: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
        <select value={form.groupeId} onChange={(e) => setForm((f) => ({ ...f, groupeId: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
          <option value="" style={{ background: "#101A2B" }}>
            — groupe —
          </option>
          {groupes.map((g) => (
            <option key={g.id} value={g.id} style={{ background: "#101A2B" }}>
              {g.nom}
            </option>
          ))}
        </select>
        <input
          type="date"
          title="Membre depuis"
          value={form.membreDepuis}
          onChange={(e) => setForm((f) => ({ ...f, membreDepuis: e.target.value }))}
          className="rounded-[9px] px-3 py-2.5 text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
        />
        <button type="submit" disabled={saving} className="rounded-[9px] px-4 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Création…" : "Créer le nageur"}
        </button>
      </form>

      <div className="flex flex-col gap-2.5">
        {nageurs.map((n) => (
          <div key={n.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3 flex-wrap" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <div style={{ minWidth: 160 }}>
              <div className="text-sm font-semibold">{n.nom}</div>
              <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                {n.age} ans · {n.categorie} · {n.specialite}
              </div>
            </div>
            <select
              defaultValue={n.groupeId ?? ""}
              onChange={(e) => update(n.id, { groupeId: e.target.value || null })}
              className="rounded-[9px] px-2.5 py-2 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
            >
              <option value="" style={{ background: "#101A2B" }}>
                — groupe —
              </option>
              {groupes.map((g) => (
                <option key={g.id} value={g.id} style={{ background: "#101A2B" }}>
                  {g.nom}
                </option>
              ))}
            </select>
            <input
              type="number"
              defaultValue={n.pointsFFN}
              onBlur={(e) => update(n.id, { pointsFFN: parseInt(e.target.value, 10) || 0 })}
              className="rounded-[9px] px-2.5 py-2 text-sm outline-none"
              style={{ width: 90, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              title="Points FFN"
            />
            <input
              type="number"
              defaultValue={n.presenceRate}
              onBlur={(e) => update(n.id, { presenceRate: parseInt(e.target.value, 10) || 0 })}
              className="rounded-[9px] px-2.5 py-2 text-sm outline-none"
              style={{ width: 90, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              title="Présence %"
            />
            <input
              type="date"
              title="Membre depuis"
              defaultValue={n.membreDepuis ?? ""}
              onBlur={(e) => update(n.id, { membreDepuis: e.target.value || null })}
              className="rounded-[9px] px-2.5 py-2 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
            />
            <button onClick={() => remove(n.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
