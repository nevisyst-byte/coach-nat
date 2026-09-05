"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProgressBar } from "@/components/ui/Card";
import { JOURS, fmtKm } from "@/lib/format";

type CreneauStage = {
  id: string;
  jour: number;
  debut: string;
  fin: string;
  type: string;
  groupe: string;
  bassin: string;
  theme: string;
  volume: number;
  coach: { user: { name: string } } | null;
};

type StageDetail = {
  id: string;
  nom: string;
  periodeLabel: string;
  lieu: string;
  jours: { jour: number; dateLabel: string }[];
  creneaux: CreneauStage[];
};

type StageCard = {
  id: string;
  nom: string;
  periodeLabel: string;
  lieu: string;
  groupesLabel: string;
  coachsLabel: string;
  statut: string;
  color: string;
  inscrits: number;
  places: number;
  budgetLabel: string | null;
  regleLabel: string;
  volumeM: number;
  nbCreneaux: number;
};

const STAGE_PHOTOS = ["/assets/pool-lanes.jpg", "/assets/swimmer.jpg", "/assets/flip-turn.jpg", "/assets/coach-poolside.jpg"];
const TYPE_COLOR: Record<string, string> = { EAU: "#1E7BFF", PHYSIQUE: "#F2B33D", VIDEO: "#8C6BFF", RECUP: "#2ECC8F" };
const STATUT_STYLE: Record<string, [string, string]> = {
  CONFIRME: ["rgba(46,204,143,0.14)", "#2ECC8F"],
  OUVERT: ["rgba(30,123,255,0.14)", "#8CC4FF"],
  EN_PREPARATION: ["rgba(242,179,61,0.15)", "#F2B33D"],
};
const STATUT_LABEL: Record<string, string> = { CONFIRME: "Confirmé", OUVERT: "Ouvert aux inscriptions", EN_PREPARATION: "En préparation" };

export function StagesClient({
  stage,
  stages,
  groupesOptions,
  coachs,
}: {
  stage: StageDetail;
  stages: StageCard[];
  groupesOptions: string[];
  coachs: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const [creneauOpen, setCreneauOpen] = useState(false);
  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ jour: 0, debut: "07:00", fin: "09:00", type: "EAU", groupe: groupesOptions[0] ?? "Tous groupes", coachId: "", bassin: "Bassin 50 m", theme: "Volume aérobie", volume: "4000" });
  const [sForm, setSForm] = useState({ nom: "", periodeLabel: "", lieu: "", groupesLabel: "", places: "20", budgetLabel: "" });

  const volTotal = stage.creneaux.reduce((a, c) => a + c.volume, 0);
  const byDay = JOURS.map((_, i) => stage.creneaux.filter((c) => c.jour === i).sort((a, b) => a.debut.localeCompare(b.debut)));

  function openCreneau(jour: number) {
    setForm((f) => ({ ...f, jour }));
    setCreneauOpen(true);
  }

  async function submitCreneau() {
    setSaving(true);
    try {
      await fetch(`/api/stages/${stage.id}/creneaux`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, coachId: form.coachId || null, volume: parseInt(form.volume, 10) || 0 }),
      });
      setCreneauOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function removeCreneau(id: string) {
    await fetch(`/api/stages/${stage.id}/creneaux/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function submitStage() {
    setSaving(true);
    try {
      const res = await fetch("/api/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sForm, places: parseInt(sForm.places, 10) || 20 }),
      });
      const data = await res.json();
      setStageFormOpen(false);
      router.push(`/stages?stage=${data.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-baseline justify-between gap-3.5 flex-wrap mb-4">
          <div>
            <h2 className="font-display text-xl tracking-[0.05em]">{stage.nom} — planning de la semaine</h2>
            <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
              {stage.periodeLabel} · {stage.lieu} · {fmtKm(volTotal)}
            </div>
          </div>
          <button onClick={() => openCreneau(0)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}>
            ＋ Ajouter un créneau
          </button>
        </div>

        <div className="overflow-x-auto pb-1.5">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(7,minmax(186px,1fr))", minWidth: 1240 }}>
            {JOURS.map((nom, i) => {
              const dateLabel = stage.jours.find((j) => j.jour === i)?.dateLabel || "";
              return (
                <div key={nom} className="flex flex-col gap-2.5">
                  <div className="text-center rounded-[11px] p-2.5" style={{ background: dateLabel ? "var(--bg-panel)" : "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                    <div className="font-display text-[15px] tracking-[0.12em] uppercase" style={{ color: dateLabel ? "var(--ink)" : "var(--ink-muted)" }}>
                      {nom}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--ink-secondary)" }}>
                      {dateLabel || "—"}
                    </div>
                  </div>
                  {byDay[i].map((c) => (
                    <div key={c.id} className="rounded-[11px] p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${TYPE_COLOR[c.type]}` }}>
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-display text-[17px]">{c.debut}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.08)", color: TYPE_COLOR[c.type] }}>
                          {c.type}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-col gap-1 text-xs" style={{ color: "var(--ink-body)" }}>
                        <div>
                          {c.debut}–{c.fin}
                        </div>
                        <div className="font-semibold" style={{ color: "var(--ink)" }}>
                          {c.groupe}
                        </div>
                        <div>{c.coach?.user.name ?? "—"}</div>
                        <div>
                          {c.bassin} · {fmtKm(c.volume)}
                        </div>
                        <div style={{ color: "#7FDCFF" }}>{c.theme}</div>
                      </div>
                      <div className="flex gap-1.5 mt-2.5">
                        <Link
                          href={`/presences?slot=stage:${c.id}`}
                          className="flex-1 text-center rounded-lg py-1.5 text-[11px] font-bold"
                          style={{ border: "1px solid rgba(30,123,255,0.35)", background: "rgba(30,123,255,0.12)", color: "#8CC4FF" }}
                        >
                          Présences
                        </Link>
                        <Link
                          href="/nageurs"
                          className="flex-1 text-center rounded-lg py-1.5 text-[11px] font-bold"
                          style={{ border: "1px solid rgba(232,68,43,0.35)", background: "rgba(232,68,43,0.12)", color: "#FF9179" }}
                        >
                          Évaluer
                        </Link>
                      </div>
                      <button onClick={() => removeCreneau(c.id)} className="mt-1.5 w-full rounded-lg py-1.5 text-[11px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
                        Supprimer
                      </button>
                    </div>
                  ))}
                  <button onClick={() => openCreneau(i)} className="rounded-[11px] p-3 text-xs cursor-pointer" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-muted)" }}>
                    ＋ créneau
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))" }}>
        {stages.map((st, i) => {
          const [bg, fg] = STATUT_STYLE[st.statut];
          const remplissage = Math.round((st.inscrits / st.places) * 100);
          return (
            <Link
              key={st.id}
              href={`/stages?stage=${st.id}`}
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: `1px solid ${st.id === stage.id ? "#24C8FF" : "var(--border)"}`, borderLeft: `4px solid ${st.color}` }}
            >
              <div
                style={{
                  height: 96,
                  backgroundImage: `linear-gradient(90deg,rgba(14,23,39,0.25),rgba(14,23,39,0.85)), url('${STAGE_PHOTOS[i % STAGE_PHOTOS.length]}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="p-5">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-xl tracking-[0.03em]">{st.nom}</h3>
                  <div className="text-[13px] mt-1" style={{ color: "var(--ink-body)" }}>
                    {st.periodeLabel} · {st.lieu}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-md" style={{ background: bg, color: fg }}>
                  {STATUT_LABEL[st.statut]}
                </span>
              </div>
              <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))" }}>
                <div>
                  <div className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "#61789B" }}>
                    Groupes
                  </div>
                  <div className="text-[13px] font-semibold mt-0.5">{st.groupesLabel}</div>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "#61789B" }}>
                    Volume
                  </div>
                  <div className="text-[13px] font-semibold mt-0.5">
                    {fmtKm(st.volumeM)} · {st.nbCreneaux} créneaux
                  </div>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "#61789B" }}>
                    Budget
                  </div>
                  <div className="text-[13px] font-semibold mt-0.5">{st.budgetLabel ?? "—"}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "var(--ink-body)" }}>Inscriptions</span>
                  <span className="font-semibold">
                    {st.inscrits} / {st.places} places · {remplissage}%
                  </span>
                </div>
                <ProgressBar value={remplissage} color={st.color} />
              </div>
              <div className="flex justify-between items-center gap-3 mt-4 pt-3.5 flex-wrap" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                  Encadrement · {st.coachsLabel}
                </div>
              </div>
              </div>
            </Link>
          );
        })}
      </div>

      <button
        onClick={() => setStageFormOpen(true)}
        className="self-start rounded-[10px] px-5 py-3 text-[13px] font-semibold cursor-pointer"
        style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-body)" }}
      >
        ＋ Créer un stage
      </button>

      {creneauOpen && (
        <div onClick={() => setCreneauOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-y-auto" style={{ maxWidth: 620, maxHeight: "88vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <div>
                <h2 className="font-display text-[22px] tracking-[0.05em]">Nouveau créneau</h2>
                <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
                  {stage.nom} · plusieurs créneaux possibles le même jour
                </div>
              </div>
              <button onClick={() => setCreneauOpen(false)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Jour
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {JOURS.map((j, i) => {
                    const dateLabel = stage.jours.find((x) => x.jour === i)?.dateLabel || "—";
                    return (
                      <button
                        key={j}
                        onClick={() => setForm((f) => ({ ...f, jour: i }))}
                        className="rounded-[10px] px-3 py-2 text-center cursor-pointer"
                        style={{ border: `1px solid ${form.jour === i ? "#1E7BFF" : "var(--border-strong)"}`, background: form.jour === i ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)" }}
                      >
                        <div className="text-xs font-bold uppercase tracking-[0.06em]">{j}</div>
                        <div className="text-[10px]" style={{ color: "var(--ink-secondary)" }}>
                          {dateLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Type de créneau
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {["EAU", "PHYSIQUE", "VIDEO", "RECUP"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer"
                      style={{ border: `1px solid ${form.type === t ? TYPE_COLOR[t] : "var(--border-strong)"}`, color: form.type === t ? TYPE_COLOR[t] : "var(--ink-body)" }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
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
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Volume (m)
                  </div>
                  <input type="number" step={500} value={form.volume} onChange={(e) => setForm((f) => ({ ...f, volume: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
                </div>
              </div>
              <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Groupe
                  </div>
                  <select value={form.groupe} onChange={(e) => setForm((f) => ({ ...f, groupe: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                    {groupesOptions.map((g) => (
                      <option key={g} value={g} style={{ background: "#101A2B" }}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
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
                    Lieu / bassin
                  </div>
                  <input value={form.bassin} onChange={(e) => setForm((f) => ({ ...f, bassin: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Thématique
                  </div>
                  <select value={form.theme} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                    {["Volume aérobie", "Seuil", "VMA", "Lactique", "Vitesse", "Technique", "Récupération"].map((t) => (
                      <option key={t} value={t} style={{ background: "#101A2B" }}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end">
              <button onClick={() => setCreneauOpen(false)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button onClick={submitCreneau} disabled={saving} className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Ajout…" : "Ajouter au planning"}
              </button>
            </div>
          </div>
        </div>
      )}

      {stageFormOpen && (
        <div onClick={() => setStageFormOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-y-auto" style={{ maxWidth: 560, maxHeight: "88vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">Créer un stage</h2>
              <button onClick={() => setStageFormOpen(false)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Nom du stage
                </div>
                <input value={sForm.nom} onChange={(e) => setSForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Stage Printemps · Élite" className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Période
                </div>
                <input value={sForm.periodeLabel} onChange={(e) => setSForm((f) => ({ ...f, periodeLabel: e.target.value }))} placeholder="12 → 16 avr. 2027" className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Lieu
                </div>
                <input value={sForm.lieu} onChange={(e) => setSForm((f) => ({ ...f, lieu: e.target.value }))} placeholder="CREPS, piscine…" className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Groupes
                </div>
                <input value={sForm.groupesLabel} onChange={(e) => setSForm((f) => ({ ...f, groupesLabel: e.target.value }))} placeholder="Élite · Espoir" className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Places
                </div>
                <input type="number" value={sForm.places} onChange={(e) => setSForm((f) => ({ ...f, places: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Budget
                </div>
                <input value={sForm.budgetLabel} onChange={(e) => setSForm((f) => ({ ...f, budgetLabel: e.target.value }))} placeholder="3 200 €" className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
              </div>
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end">
              <button onClick={() => setStageFormOpen(false)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button onClick={submitStage} disabled={saving} className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#E8442B,#B92E19)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Création…" : "Créer le stage"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
