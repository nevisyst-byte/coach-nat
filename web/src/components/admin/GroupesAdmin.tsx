"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Groupe = { id: string; nom: string; pole: string; categorie: string; color: string; objectif: string | null; coachId: string | null };
type Coach = { id: string; nom: string };
type Nageur = { id: string; nom: string; groupeId: string | null };

const POLES = ["FORMATION", "COMPETITION", "SAUVETAGE", "LOISIR"];

export function GroupesAdmin({ groupes, coachs, nageurs }: { groupes: Groupe[]; coachs: Coach[]; nageurs: Nageur[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ nom: "", pole: "COMPETITION", categorie: "", color: "#1E7BFF", objectif: "", coachId: "" });
  const [saving, setSaving] = useState(false);

  const [managing, setManaging] = useState<Groupe | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [savingRoster, setSavingRoster] = useState(false);

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

  function openRoster(g: Groupe) {
    setSelected(new Set(nageurs.filter((n) => n.groupeId === g.id).map((n) => n.id)));
    setQuery("");
    setManaging(g);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveRoster() {
    if (!managing) return;
    setSavingRoster(true);
    try {
      await fetch(`/api/admin/groupes/${managing.id}/nageurs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nageurIds: Array.from(selected) }),
      });
      setManaging(null);
      router.refresh();
    } finally {
      setSavingRoster(false);
    }
  }

  const filteredNageurs = useMemo(
    () => nageurs.filter((n) => n.nom.toLowerCase().includes(query.toLowerCase())),
    [nageurs, query]
  );

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
        {groupes.map((g) => {
          const count = nageurs.filter((n) => n.groupeId === g.id).length;
          return (
            <div key={g.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3 flex-wrap" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${g.color}` }}>
              <div style={{ minWidth: 160 }}>
                <div className="text-sm font-semibold">{g.nom}</div>
                <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                  {g.pole} · {g.categorie} · {count} nageur{count > 1 ? "s" : ""}
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
              <button
                onClick={() => openRoster(g)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
                style={{ border: "1px solid rgba(30,123,255,0.4)", background: "rgba(30,123,255,0.1)", color: "#7FDCFF" }}
              >
                Nageurs
              </button>
              <button onClick={() => removeGroupe(g.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
                Supprimer
              </button>
            </div>
          );
        })}
      </div>

      {managing && (
        <div onClick={() => setManaging(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 480, maxHeight: "82vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <div>
                <h2 className="font-display text-[22px] tracking-[0.05em]">Nageurs — {managing.nom}</h2>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                  {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
                </div>
              </div>
              <button onClick={() => setManaging(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 pt-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un nageur…"
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              />
            </div>
            <div className="px-6 py-4 flex-1 overflow-y-auto flex flex-col gap-1.5">
              {filteredNageurs.map((n) => {
                const inAnotherGroupe = n.groupeId && n.groupeId !== managing.id;
                return (
                  <label
                    key={n.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer"
                    style={{ background: selected.has(n.id) ? "rgba(30,123,255,0.12)" : "transparent" }}
                  >
                    <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggle(n.id)} className="w-4 h-4 cursor-pointer" />
                    <span className="flex-1 text-sm">{n.nom}</span>
                    {inAnotherGroupe && (
                      <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                        déjà dans un autre groupe
                      </span>
                    )}
                  </label>
                );
              })}
              {filteredNageurs.length === 0 && (
                <div className="text-[13px] text-center py-6" style={{ color: "var(--ink-secondary)" }}>
                  Aucun nageur trouvé.
                </div>
              )}
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setManaging(null)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button
                onClick={saveRoster}
                disabled={savingRoster}
                className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: savingRoster ? 0.7 : 1 }}
              >
                {savingRoster ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
