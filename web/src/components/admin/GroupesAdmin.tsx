"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { POLE_LABELS, POLE_COLORS, POLE_ORDER } from "@/lib/theme";
import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";

type Groupe = { id: string; nom: string; pole: string; categorie: string; color: string; objectif: string | null; coachId: string | null };
type Coach = { id: string; nom: string };
type Nageur = { id: string; nom: string; groupeId: string | null };

const POLES = ["FORMATION", "COMPETITION", "SAUVETAGE", "LOISIR"];

// Grille partagée entre l'en-tête et les lignes du tableau, pour que les
// colonnes restent alignées quelle que soit la longueur du contenu. Le pôle
// n'est pas une colonne : les groupes sont déjà regroupés par pôle (comme
// sur /nageurs), la section fait déjà office d'étiquette.
const ROW_COLUMNS = "1.4fr 130px 90px 170px 1.3fr 170px";
const LABEL_STYLE: React.CSSProperties = { color: "#61789B", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 };
const INPUT_STYLE: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" };

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
        body: JSON.stringify({ ...form, coachId: form.coachId || null, objectif: form.objectif || undefined }),
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

  const groupesParPole = useMemo(
    () =>
      POLE_ORDER.map((pole) => ({
        pole,
        nom: POLE_LABELS[pole] ?? pole,
        color: POLE_COLORS[pole] ?? "#61789B",
        groupes: groupes.filter((g) => g.pole === pole),
      })).filter((section) => section.groupes.length > 0),
    [groupes]
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
        <div style={{ ...LABEL_STYLE, marginBottom: 12 }}>Nouveau groupe</div>
        <form onSubmit={createGroupe} className="grid gap-3.5 items-end" style={{ gridTemplateColumns: "1.4fr 130px 130px 60px 170px 1.3fr auto" }}>
          <div>
            <div style={LABEL_STYLE}>Nom du groupe</div>
            <input required placeholder="ex. Compétition Élite" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE} />
          </div>
          <div>
            <div style={LABEL_STYLE}>Pôle</div>
            <select value={form.pole} onChange={(e) => setForm((f) => ({ ...f, pole: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}>
              {POLES.map((p) => (
                <option key={p} value={p} style={{ background: "#101A2B" }}>
                  {POLE_LABELS[p] ?? p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={LABEL_STYLE}>Catégorie</div>
            <input required placeholder="ex. Élite" value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE} />
          </div>
          <div>
            <div style={LABEL_STYLE}>Couleur</div>
            <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-full rounded-[9px] h-[42px] cursor-pointer" style={INPUT_STYLE} />
          </div>
          <div>
            <div style={LABEL_STYLE}>Coach responsable</div>
            <select value={form.coachId} onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}>
              <option value="" style={{ background: "#101A2B" }}>
                — aucun —
              </option>
              {coachs.map((c) => (
                <option key={c.id} value={c.id} style={{ background: "#101A2B" }}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={LABEL_STYLE}>Objectif en cours</div>
            <select value={form.objectif} onChange={(e) => setForm((f) => ({ ...f, objectif: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ ...INPUT_STYLE, color: form.objectif ? couleurObjectif(form.objectif) : INPUT_STYLE.color }}>
              <option value="" style={{ background: "#101A2B", color: "var(--ink)" }}>
                — aucun —
              </option>
              {OBJECTIFS.map((o) => (
                <option key={o.nom} value={o.nom} style={{ background: "#101A2B", color: o.color }}>
                  {o.nom}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={saving} className="rounded-[9px] px-4 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1, height: 42 }}>
            {saving ? "Création…" : "Créer"}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        {groupesParPole.map((section) => (
          <div key={section.pole} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", borderTop: `3px solid ${section.color}` }}>
            <div className="px-4 py-3 flex items-center gap-2.5" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: section.color }} />
              <span className="font-display text-[15px] tracking-[0.05em] uppercase">{section.nom}</span>
              <span className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                {section.groupes.length} groupe{section.groupes.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="overflow-x-auto">
              <div style={{ minWidth: 900 }}>
                <div className="grid gap-3 px-3.5 py-2" style={{ gridTemplateColumns: ROW_COLUMNS, background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                  {["Groupe", "Catégorie", "Effectif", "Coach responsable", "Objectif en cours", "Actions"].map((label) => (
                    <div key={label} style={{ ...LABEL_STYLE, marginBottom: 0 }}>
                      {label}
                    </div>
                  ))}
                </div>
                {section.groupes.map((g) => {
                  const count = nageurs.filter((n) => n.groupeId === g.id).length;
                  return (
                    <div
                      key={g.id}
                      className="grid gap-3 items-center px-3.5 py-3"
                      style={{ gridTemplateColumns: ROW_COLUMNS, borderLeft: `4px solid ${g.color}`, borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.015)" }}
                    >
                      <div className="text-sm font-semibold truncate">{g.nom}</div>
                      <div className="text-sm truncate" style={{ color: "var(--ink-body)" }}>
                        {g.categorie}
                      </div>
                      <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                        {count} nageur{count > 1 ? "s" : ""}
                      </div>
                      <select
                        defaultValue={g.coachId ?? ""}
                        onChange={(e) => updateGroupe(g.id, { coachId: e.target.value || null })}
                        className="w-full rounded-[9px] px-2.5 py-2 text-sm outline-none"
                        style={INPUT_STYLE}
                      >
                        <option value="" style={{ background: "#101A2B" }}>
                          — aucun —
                        </option>
                        {coachs.map((c) => (
                          <option key={c.id} value={c.id} style={{ background: "#101A2B" }}>
                            {c.nom}
                          </option>
                        ))}
                      </select>
                      <select
                        defaultValue={g.objectif ?? ""}
                        onChange={(e) => updateGroupe(g.id, { objectif: e.target.value || null })}
                        className="w-full rounded-[9px] px-2.5 py-2 text-sm outline-none"
                        style={{ ...INPUT_STYLE, color: g.objectif ? couleurObjectif(g.objectif) : INPUT_STYLE.color }}
                      >
                        <option value="" style={{ background: "#101A2B", color: "var(--ink)" }}>
                          — aucun —
                        </option>
                        {/* Objectif existant en base (texte libre, saisi avant le passage à cette
                            liste contrôlée) : gardé sélectionnable pour ne pas le faire disparaître
                            silencieusement du sélecteur. Choisir un objectif de la liste le remplace. */}
                        {g.objectif && !OBJECTIFS.some((o) => o.nom === g.objectif) && (
                          <option value={g.objectif} style={{ background: "#101A2B", color: "var(--ink-secondary)" }}>
                            {g.objectif} (existant)
                          </option>
                        )}
                        {OBJECTIFS.map((o) => (
                          <option key={o.nom} value={o.nom} style={{ background: "#101A2B", color: o.color }}>
                            {o.nom}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1.5">
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
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        {groupes.length === 0 && (
          <div className="text-[13px] text-center py-8 rounded-2xl" style={{ color: "var(--ink-secondary)", border: "1px solid var(--border)" }}>
            Aucun groupe pour l&apos;instant.
          </div>
        )}
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
