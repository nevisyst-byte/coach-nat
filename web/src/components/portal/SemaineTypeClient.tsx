"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ETAT_COLOR, ETAT_LABEL, JOURS } from "@/lib/format";

type Creneau = {
  id: string;
  jour: number;
  debut: string;
  fin: string;
  bassin: string;
  etat: string;
  effectifLabel: string | null;
  groupeId: string;
  groupe: { nom: string };
  coachId: string | null;
  coach: { user: { name: string } } | null;
  libelleCoach: string | null;
  actifHorsVacances: boolean;
  effectifNageurs: { nageurId: string }[];
};

type Option = { id: string; nom: string };
type NageurOption = { id: string; nom: string; groupeId: string | null };

export function SemaineTypeClient({
  creneaux,
  groupes,
  coachs,
  nageurs,
}: {
  creneaux: Creneau[];
  groupes: Option[];
  coachs: Option[];
  nageurs: NageurOption[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ jour: 0, debut: "18:00", fin: "19:30", groupeId: groupes[0]?.id ?? "", coachId: "", bassin: "Bassin 50 m", etat: "ASSURE" });
  const [saving, setSaving] = useState(false);

  const [effectifCreneau, setEffectifCreneau] = useState<Creneau | null>(null);
  const [toutLeGroupe, setToutLeGroupe] = useState(true);
  const [effectifSelected, setEffectifSelected] = useState<Set<string>>(new Set());
  const [savingEffectif, setSavingEffectif] = useState(false);

  function openModal(jour: number) {
    setEditingId(null);
    setForm({ jour, debut: "18:00", fin: "19:30", groupeId: groupes[0]?.id ?? "", coachId: "", bassin: "Bassin 50 m", etat: "ASSURE" });
    setModalOpen(true);
  }

  function openEditModal(c: Creneau) {
    setEditingId(c.id);
    setForm({ jour: c.jour, debut: c.debut, fin: c.fin, groupeId: c.groupeId, coachId: c.coachId ?? "", bassin: c.bassin, etat: c.etat });
    setModalOpen(true);
  }

  async function submit() {
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/creneaux/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, coachId: form.coachId || null }),
        });
      } else {
        await fetch("/api/creneaux", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, coachId: form.coachId || null }),
        });
      }
      setModalOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/creneaux/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  async function moveToDay(id: string, jour: number) {
    await fetch(`/api/creneaux/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jour }),
    });
    router.refresh();
  }

  function onDrop(e: React.DragEvent, jourCible: number) {
    e.preventDefault();
    setDragOverDay(null);
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    setDraggedId(null);
    if (!id) return;
    const c = creneaux.find((cr) => cr.id === id);
    if (!c || c.jour === jourCible) return;
    moveToDay(id, jourCible);
  }

  async function toggleActifHorsVacances(id: string, current: boolean) {
    await fetch(`/api/creneaux/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actifHorsVacances: !current }),
    });
    router.refresh();
  }

  function openEffectif(c: Creneau) {
    const membresGroupe = nageurs.filter((n) => n.groupeId === c.groupeId);
    if (c.effectifNageurs.length > 0) {
      setToutLeGroupe(false);
      setEffectifSelected(new Set(c.effectifNageurs.map((e) => e.nageurId)));
    } else {
      setToutLeGroupe(true);
      setEffectifSelected(new Set(membresGroupe.map((n) => n.id)));
    }
    setEffectifCreneau(c);
  }

  function toggleEffectifNageur(id: string) {
    setEffectifSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveEffectif() {
    if (!effectifCreneau) return;
    setSavingEffectif(true);
    try {
      await fetch(`/api/creneaux/${effectifCreneau.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nageurIds: toutLeGroupe ? null : Array.from(effectifSelected) }),
      });
      setEffectifCreneau(null);
      router.refresh();
    } finally {
      setSavingEffectif(false);
    }
  }

  const byDay = JOURS.map((_, i) => creneaux.filter((c) => c.jour === i).sort((a, b) => a.debut.localeCompare(b.debut)));

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
        La semaine type définit les créneaux récurrents hors vacances scolaires — c&apos;est ce qui
        s&apos;initialise en début de saison. Elle se met en pause automatiquement pendant les vacances
        (réglage par créneau) ; les stages de vacances se saisissent dans l&apos;onglet « Vacances &amp;
        stages ».
      </div>

      <div className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
        Astuce : glisse une carte pour la déplacer sur un autre jour (souris) — ou utilise ✎
        (modifier) sur mobile/tablette.
      </div>

      <div className="overflow-x-auto pb-1.5">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(7,minmax(178px,1fr))", minWidth: 1180 }}>
          {JOURS.map((nom, i) => (
            <div
              key={nom}
              className="flex flex-col gap-2.5 rounded-[11px]"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDay(i);
              }}
              onDragLeave={() => setDragOverDay((d) => (d === i ? null : d))}
              onDrop={(e) => onDrop(e, i)}
              style={{ outline: dragOverDay === i ? "2px dashed #1E7BFF" : "2px dashed transparent", outlineOffset: 3 }}
            >
              <div className="text-center rounded-[11px] p-2.5" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                <div className="font-display text-[15px] tracking-[0.12em] uppercase">{nom}</div>
              </div>
              {byDay[i].map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", c.id);
                    setDraggedId(c.id);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  className="rounded-[11px] p-3.5 cursor-grab active:cursor-grabbing"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `4px solid ${ETAT_COLOR[c.etat]}`, opacity: draggedId === c.id ? 0.4 : 1 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: ETAT_COLOR[c.etat] }} />
                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: ETAT_COLOR[c.etat] }}>
                      {ETAT_LABEL[c.etat]}
                    </span>
                    <button onClick={() => openEditModal(c)} className="ml-auto text-xs cursor-pointer" style={{ color: "var(--ink-muted)" }} title="Modifier (jour, horaire, groupe, coach…)">
                      ✎
                    </button>
                    <button onClick={() => remove(c.id)} className="text-xs cursor-pointer" style={{ color: "var(--ink-muted)" }} title="Supprimer">
                      ✕
                    </button>
                  </div>
                  <div className="mt-2.5 text-[15px] font-semibold leading-tight">{c.groupe.nom}</div>
                  <div className="mt-0.5 text-[13px]">{c.libelleCoach ?? c.coach?.user.name ?? "—"}</div>
                  <div className="mt-2.5 pt-2.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]" style={{ borderTop: "1px solid var(--border)", color: "#7D91AE" }}>
                    <span>
                      {c.debut}–{c.fin}
                    </span>
                    <span>·</span>
                    <span>{c.bassin}</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1 items-start">
                    <button
                      onClick={() => toggleActifHorsVacances(c.id, c.actifHorsVacances)}
                      className="text-[11px] cursor-pointer underline"
                      style={{ color: "var(--ink-muted)" }}
                      title="Bascule si ce créneau continue ou non pendant les vacances scolaires"
                    >
                      {c.actifHorsVacances ? "En pause pendant les vacances" : "Continue pendant les vacances"}
                    </button>
                    <button
                      onClick={() => openEffectif(c)}
                      className="text-[11px] cursor-pointer underline"
                      style={{ color: "var(--ink-muted)" }}
                      title="Choisir qui, dans le groupe, assiste à ce créneau"
                    >
                      {c.effectifNageurs.length > 0 ? `Effectif : ${c.effectifNageurs.length} nageur${c.effectifNageurs.length > 1 ? "s" : ""}` : "Effectif : tout le groupe"}
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => openModal(i)}
                className="rounded-[11px] p-3 text-xs cursor-pointer"
                style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-muted)" }}
              >
                + créneau
              </button>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-y-auto" style={{ maxWidth: 560, maxHeight: "88vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">{editingId ? "Modifier le créneau" : "Nouveau créneau"} — {JOURS[form.jour]}</h2>
              <button onClick={() => setModalOpen(false)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Jour
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {JOURS.map((j, i) => (
                    <button
                      key={j}
                      onClick={() => setForm((f) => ({ ...f, jour: i }))}
                      className="rounded-[10px] px-3.5 py-2 text-xs font-bold cursor-pointer"
                      style={{ border: `1px solid ${form.jour === i ? "#1E7BFF" : "var(--border-strong)"}`, background: form.jour === i ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)" }}
                    >
                      {j}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Début
                  </div>
                  <input type="time" value={form.debut} onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Fin
                  </div>
                  <input type="time" value={form.fin} onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Groupe
                </div>
                <select value={form.groupeId} onChange={(e) => setForm((f) => ({ ...f, groupeId: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                  {groupes.map((g) => (
                    <option key={g.id} value={g.id} style={{ background: "#101A2B" }}>
                      {g.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Coach
                  </div>
                  <select value={form.coachId} onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                    <option value="" style={{ background: "#101A2B" }}>
                      —
                    </option>
                    {coachs.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: "#101A2B" }}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Bassin
                  </div>
                  <input value={form.bassin} onChange={(e) => setForm((f) => ({ ...f, bassin: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  État d&apos;encadrement
                </div>
                <div className="flex gap-1.5">
                  {["ASSURE", "REMPLACE", "A_COUVRIR"].map((e) => (
                    <button
                      key={e}
                      onClick={() => setForm((f) => ({ ...f, etat: e }))}
                      className="rounded-[9px] px-3.5 py-2 text-xs font-bold cursor-pointer"
                      style={{ border: `1px solid ${form.etat === e ? ETAT_COLOR[e] : "var(--border-strong)"}`, color: form.etat === e ? ETAT_COLOR[e] : "var(--ink-body)" }}
                    >
                      {ETAT_LABEL[e]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end">
              <button onClick={() => setModalOpen(false)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button onClick={submit} disabled={saving} className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Ajouter à la semaine type"}
              </button>
            </div>
          </div>
        </div>
      )}

      {effectifCreneau && (
        <div onClick={() => setEffectifCreneau(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 480, maxHeight: "82vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <div>
                <h2 className="font-display text-[22px] tracking-[0.05em]">Effectif — {effectifCreneau.groupe.nom}</h2>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                  {JOURS[effectifCreneau.jour]} {effectifCreneau.debut}–{effectifCreneau.fin}
                </div>
              </div>
              <button onClick={() => setEffectifCreneau(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 pt-4 flex gap-1.5">
              <button
                onClick={() => setToutLeGroupe(true)}
                className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer"
                style={{ border: `1px solid ${toutLeGroupe ? "#1E7BFF" : "var(--border-strong)"}`, background: toutLeGroupe ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)", color: toutLeGroupe ? "var(--ink)" : "var(--ink-body)" }}
              >
                Tout le groupe
              </button>
              <button
                onClick={() => setToutLeGroupe(false)}
                className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer"
                style={{ border: `1px solid ${!toutLeGroupe ? "#1E7BFF" : "var(--border-strong)"}`, background: !toutLeGroupe ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)", color: !toutLeGroupe ? "var(--ink)" : "var(--ink-body)" }}
              >
                Sélection personnalisée
              </button>
            </div>
            {!toutLeGroupe && (
              <div className="px-6 py-4 flex-1 overflow-y-auto flex flex-col gap-1.5">
                {nageurs
                  .filter((n) => n.groupeId === effectifCreneau.groupeId)
                  .map((n) => (
                    <label key={n.id} className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer" style={{ background: effectifSelected.has(n.id) ? "rgba(30,123,255,0.12)" : "transparent" }}>
                      <input type="checkbox" checked={effectifSelected.has(n.id)} onChange={() => toggleEffectifNageur(n.id)} className="w-4 h-4 cursor-pointer" />
                      <span className="flex-1 text-sm">{n.nom}</span>
                    </label>
                  ))}
                {nageurs.filter((n) => n.groupeId === effectifCreneau.groupeId).length === 0 && (
                  <div className="text-[13px] text-center py-6" style={{ color: "var(--ink-secondary)" }}>
                    Aucun nageur dans ce groupe.
                  </div>
                )}
              </div>
            )}
            <div className="px-6 pb-5 pt-4 flex gap-2.5 justify-end" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setEffectifCreneau(null)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button
                onClick={saveEffectif}
                disabled={savingEffectif}
                className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: savingEffectif ? 0.7 : 1 }}
              >
                {savingEffectif ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
