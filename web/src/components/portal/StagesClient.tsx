"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProgressBar } from "@/components/ui/Card";
import { ETAT_COLOR, JOURS, fmtKm } from "@/lib/format";
import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
import { genererSeance, genererSeanceMulti, type Bloc, type Combo } from "@/lib/seance-generator";
import { buildManualBlocs, type SectionManuelle } from "@/lib/seance-manual";
import { SeanceContenuEditor, contenuVide, combosValidesPour, type SeanceContenu, type Modele } from "./SeanceContenuEditor";

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
  variant: string | null;
  intensite: string | null;
  nage: string | null;
  combos: Combo[] | null;
  sections: SectionManuelle[] | null;
  coachId: string | null;
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

// Couleur du taux de remplissage alignée sur le code couleur de statut du
// reste de l'app (vert = complet, orange = en cours, rouge = à couvrir) —
// plutôt que la couleur décorative propre au stage (bordure/photo).
function remplissageColor(pct: number) {
  if (pct >= 90) return ETAT_COLOR.ASSURE;
  if (pct >= 50) return ETAT_COLOR.REMPLACE;
  return ETAT_COLOR.A_COUVRIR;
}

function estDetaille(c: CreneauStage) {
  return !!c.sections || !!((c.combos && c.combos.length > 0) || (c.variant && c.intensite && c.nage));
}
function contenuPourCreneau(c: CreneauStage): Bloc[] | null {
  if (c.sections && c.sections.length > 0) return buildManualBlocs(c.debut, c.sections);
  if (c.combos && c.combos.length > 0) return genererSeanceMulti(c.combos, c.volume || 0).blocs;
  if (c.variant && c.intensite && c.nage) return genererSeance(c.variant, c.intensite, c.nage, c.volume || 0).blocs;
  return null;
}

type Form = SeanceContenu & {
  jour: number;
  debut: string;
  fin: string;
  type: string;
  groupe: string;
  coachId: string;
  bassin: string;
  theme: string;
};

export function StagesClient({
  stage,
  stages,
  groupesOptions,
  coachs,
  modeles,
}: {
  stage: StageDetail;
  stages: StageCard[];
  groupesOptions: string[];
  coachs: { id: string; nom: string }[];
  modeles: Modele[];
}) {
  const router = useRouter();
  const [creneauModal, setCreneauModal] = useState<{ mode: "new" | "edit"; creneauId?: string } | null>(null);
  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(formulaireVide());
  const [sForm, setSForm] = useState({ nom: "", dateDebut: "", dateFin: "", lieu: "", groupesLabel: "", places: "20", budgetLabel: "" });

  function formulaireVide(jour = 0): Form {
    return { ...contenuVide(), jour, debut: "07:00", fin: "09:00", type: "EAU", groupe: groupesOptions[0] ?? "Tous groupes", coachId: "", bassin: "Bassin 50 m", theme: OBJECTIFS[0].nom };
  }

  const volTotal = stage.creneaux.reduce((a, c) => a + c.volume, 0);
  const byDay = JOURS.map((_, i) => stage.creneaux.filter((c) => c.jour === i).sort((a, b) => a.debut.localeCompare(b.debut)));

  function openNouveauCreneau(jour: number) {
    setForm(formulaireVide(jour));
    setCreneauModal({ mode: "new" });
  }

  function openEditionCreneau(c: CreneauStage) {
    const aSections = !!c.sections;
    setForm({
      jour: c.jour,
      debut: c.debut,
      fin: c.fin,
      type: c.type,
      groupe: c.groupe,
      coachId: c.coachId ?? "",
      bassin: c.bassin,
      theme: c.theme,
      mode: aSections ? "manuel" : "auto",
      heureDebut: c.debut,
      combos:
        c.combos && c.combos.length > 0
          ? c.combos
          : c.variant && c.intensite && c.nage
            ? [{ variant: [c.variant], intensite: [c.intensite], nage: [{ valeur: c.nage, pourcentage: 100 }], pourcentage: 100 }]
            : contenuVide().combos,
      volume: c.volume || 3000,
      sections: c.sections ?? contenuVide().sections,
    });
    setCreneauModal({ mode: "edit", creneauId: c.id });
  }

  async function enregistrerModeleDepuisForm(nom: string) {
    const payload: Record<string, unknown> = { nom, theme: form.theme, heureDebut: form.heureDebut };
    if (form.mode === "manuel") payload.sections = form.sections;
    else {
      payload.combos = form.combos;
      payload.volumeNage = form.volume;
    }
    await fetch("/api/modeles-seance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    router.refresh();
  }

  async function submitCreneau() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        jour: form.jour,
        debut: form.debut,
        fin: form.fin,
        type: form.type,
        groupe: form.groupe,
        coachId: form.coachId || null,
        bassin: form.bassin,
        theme: form.theme,
        volume: form.mode === "auto" ? form.volume : 0,
      };
      if (form.mode === "manuel") payload.sections = form.sections;
      else payload.combos = form.combos;

      if (creneauModal?.mode === "edit" && creneauModal.creneauId) {
        await fetch(`/api/stages/${stage.id}/creneaux/${creneauModal.creneauId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch(`/api/stages/${stage.id}/creneaux`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setCreneauModal(null);
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

  const combosValides = combosValidesPour(form);
  const blocsApercu = form.mode === "auto" ? genererSeanceMulti(form.combos, form.volume || 0).blocs : buildManualBlocs(form.heureDebut, form.sections);

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
          <button onClick={() => openNouveauCreneau(0)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}>
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
                  {byDay[i].map((c) => {
                    const blocs = contenuPourCreneau(c);
                    return (
                      <div key={c.id} className="rounded-[11px] p-3 cursor-pointer" onClick={() => openEditionCreneau(c)} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `4px solid ${TYPE_COLOR[c.type]}` }}>
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
                          <div className="flex items-center gap-1" style={{ color: couleurObjectif(c.theme) }}>
                            {c.theme} {estDetaille(c) && <span title="Contenu détaillé">✦</span>}
                          </div>
                          {blocs && <div className="truncate" style={{ color: "#7FDCFF" }}>{blocs.map((b) => b.phase).join(" · ")}</div>}
                        </div>
                        <div className="flex gap-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
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
                        <button onClick={(e) => { e.stopPropagation(); removeCreneau(c.id); }} className="mt-1.5 w-full rounded-lg py-1.5 text-[11px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
                          Supprimer
                        </button>
                      </div>
                    );
                  })}
                  <button onClick={() => openNouveauCreneau(i)} className="rounded-[11px] p-3 text-xs cursor-pointer" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-muted)" }}>
                    ＋ créneau
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(380px,1fr))]">
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
                <ProgressBar value={remplissage} color={remplissageColor(remplissage)} />
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

      {creneauModal && (
        <div onClick={() => setCreneauModal(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 780, maxHeight: "90vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <div>
                <h2 className="font-display text-[22px] tracking-[0.05em]">{creneauModal.mode === "new" ? "Nouveau créneau" : "Modifier le créneau"}</h2>
                <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
                  {stage.nom} · plusieurs créneaux possibles le même jour
                </div>
              </div>
              <button onClick={() => setCreneauModal(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex-1 overflow-y-auto flex flex-col gap-4">
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
                  <input type="time" value={form.debut} onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value, heureDebut: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Fin
                  </div>
                  <input type="time" value={form.fin} onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
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
                    Objectif (macro)
                  </div>
                  <select value={form.theme} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: couleurObjectif(form.theme) }}>
                    {OBJECTIFS.map((o) => (
                      <option key={o.nom} value={o.nom} style={{ background: "#101A2B", color: o.color }}>
                        {o.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <SeanceContenuEditor value={form} onChange={(updater) => setForm((f) => ({ ...f, ...updater(f) }))} modeles={modeles} onEnregistrerModele={enregistrerModeleDepuisForm} />

              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Aperçu
                </div>
                <div className="flex flex-col gap-2.5">
                  {blocsApercu.map((b, i) => (
                    <div
                      key={i}
                      className="flex gap-3.5 rounded-xl px-3.5 py-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
                    >
                      <div style={{ minWidth: 64 }}>
                        <div className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "#61789B" }}>
                          {b.phase}
                        </div>
                        <div className="font-display text-lg">{b.distance}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold whitespace-pre-line">{b.contenu}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                          {b.consigne}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setCreneauModal(null)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button onClick={submitCreneau} disabled={saving || !combosValides} className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving || !combosValides ? 0.7 : 1 }}>
                {saving ? "Enregistrement…" : creneauModal.mode === "new" ? "Ajouter au planning" : "Enregistrer les modifications"}
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
                  Du
                </div>
                <input type="date" value={sForm.dateDebut} onChange={(e) => setSForm((f) => ({ ...f, dateDebut: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Au (7 jours max)
                </div>
                <input type="date" value={sForm.dateFin} onChange={(e) => setSForm((f) => ({ ...f, dateFin: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
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
