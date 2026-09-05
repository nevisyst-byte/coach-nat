"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
  groupe: { nom: string };
  coach: { user: { name: string } } | null;
  libelleCoach: string | null;
};

type Option = { id: string; nom: string };

export function PlanningClient({
  creneaux,
  dayLabels,
  weekLabel,
  weekOffset,
  groupes,
  coachs,
  canEdit,
  defaultCoachId = "",
}: {
  creneaux: Creneau[];
  dayLabels: string[];
  weekLabel: string;
  weekOffset: number;
  groupes: Option[];
  coachs: Option[];
  canEdit: boolean;
  defaultCoachId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ jour: 0, debut: "18:00", fin: "19:30", groupeId: groupes[0]?.id ?? "", coachId: defaultCoachId, bassin: "Bassin 50 m", etat: "ASSURE" });
  const [saving, setSaving] = useState(false);

  function pushWeek(offset: number) {
    const params = new URLSearchParams(searchParams);
    params.set("week", String(offset));
    router.push(`?${params.toString()}`);
  }

  function openModal(jour: number) {
    setForm((f) => ({ ...f, jour }));
    setModalOpen(true);
  }

  async function submit() {
    setSaving(true);
    try {
      await fetch("/api/creneaux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, coachId: form.coachId || null }),
      });
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

  const byDay = JOURS.map((_, i) => creneaux.filter((c) => c.jour === i).sort((a, b) => a.debut.localeCompare(b.debut)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-[10px] p-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }}>
          <button onClick={() => pushWeek(weekOffset - 1)} className="px-2.5 py-1 text-[15px] cursor-pointer">
            ‹
          </button>
          <span className="text-[13px] font-semibold tracking-[0.04em]">{weekLabel}</span>
          <button onClick={() => pushWeek(weekOffset + 1)} className="px-2.5 py-1 text-[15px] cursor-pointer">
            ›
          </button>
        </div>
        <div className="flex gap-3.5 flex-wrap flex-1">
          {["ASSURE", "REMPLACE", "A_COUVRIR"].map((e) => (
            <div key={e} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-body)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: ETAT_COLOR[e] }} />
              {ETAT_LABEL[e]}
            </div>
          ))}
        </div>
        {canEdit && (
          <button
            onClick={() => openModal(0)}
            className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
            style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}
          >
            + Ajouter un créneau
          </button>
        )}
      </div>

      <div className="overflow-x-auto pb-1.5">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(7,minmax(178px,1fr))", minWidth: 1180 }}>
          {JOURS.map((nom, i) => (
            <div key={nom} className="flex flex-col gap-2.5">
              <div className="text-center rounded-[11px] p-2.5" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                <div className="font-display text-[15px] tracking-[0.12em] uppercase">{nom}</div>
                <div className="text-[11px]" style={{ color: "var(--ink-secondary)" }}>
                  {dayLabels[i]}
                </div>
              </div>
              {byDay[i].map((c) => (
                <div key={c.id} className="rounded-[11px] p-3.5 group relative" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `4px solid ${ETAT_COLOR[c.etat]}` }}>
                  <div className="flex items-center gap-2">
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: ETAT_COLOR[c.etat] }} />
                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: ETAT_COLOR[c.etat] }}>
                      {ETAT_LABEL[c.etat]}
                    </span>
                    {canEdit && (
                      <button onClick={() => remove(c.id)} className="ml-auto text-xs cursor-pointer" style={{ color: "var(--ink-muted)" }} title="Supprimer">
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="mt-2.5 text-[15px] font-semibold leading-tight">{c.groupe.nom}</div>
                  <div className="mt-0.5 text-[13px]">{c.libelleCoach ?? c.coach?.user.name ?? "—"}</div>
                  <div className="mt-2.5 pt-2.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]" style={{ borderTop: "1px solid var(--border)", color: "#7D91AE" }}>
                    <span>
                      {c.debut}–{c.fin}
                    </span>
                    <span>·</span>
                    <span>{c.effectifLabel ?? "—"}</span>
                    <span>·</span>
                    <span>{c.bassin}</span>
                  </div>
                </div>
              ))}
              {canEdit && (
                <button
                  onClick={() => openModal(i)}
                  className="rounded-[11px] p-3 text-xs cursor-pointer"
                  style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-muted)" }}
                >
                  + créneau
                </button>
              )}
              {byDay[i].length === 0 && !canEdit && (
                <div className="rounded-[11px] p-5 text-center text-[13px]" style={{ border: "1px dashed var(--border)", color: "var(--ink-muted)" }}>
                  —
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-y-auto" style={{ maxWidth: 560, maxHeight: "88vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">Nouveau créneau</h2>
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
                {saving ? "Ajout…" : "Ajouter au planning"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
