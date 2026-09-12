"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
import { genererSeanceMulti, type Combo } from "@/lib/seance-generator";
import { nouvelleSection, buildManualBlocs, type SectionManuelle } from "@/lib/seance-manual";
import { SeanceContenuEditor, contenuVide, combosValidesPour, type SeanceContenu, type Modele } from "./SeanceContenuEditor";
import { mondayOf, toDateInputValue } from "@/lib/week";
import { JOURS } from "@/lib/format";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const SEMAINES_APERCU = 16;

export type Groupe = { id: string; nom: string };
export type Section = { pole: string; nom: string; color: string; groupes: Groupe[] };
export type CreneauLite = { id: string; jour: number; debut: string };
export type Plan = {
  id: string;
  nom: string;
  theme: string;
  heureDebut: string | null;
  variant: string | null;
  intensite: string | null;
  nage: string | null;
  volumeNage: number | null;
  combos: Combo[] | null;
  sections: SectionManuelle[] | null;
  dateDebut: string;
  dateFin: string;
  groupes: Groupe[];
};

export type PlanModalOpen = { mode: "new"; presetTheme: string; presetDate: Date; groupeId: string } | { mode: "edit"; plan: Plan };

type Form = SeanceContenu & {
  nom: string;
  theme: string;
  dateDebut: string;
  dureeSemaines: number;
  groupeIds: string[];
};

function ajouterJours(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function dureeEnSemaines(dateDebut: string, dateFin: string) {
  const jours = Math.round((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000) + 1;
  return Math.max(1, Math.round(jours / 7));
}
function fmtDateCourte(d: Date) {
  return `${JOURS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}
// Occurrences réelles d'un créneau (jour+heure) sur une période donnée —
// une par semaine, à partir de la première dont la date tombe à/après le
// début de la période.
function occurrences(creneau: CreneauLite, dateDebut: string, dureeSemaines: number): Date[] {
  const debut = new Date(`${dateDebut}T00:00:00`);
  const dates: Date[] = [];
  for (let w = 0; w < dureeSemaines; w++) {
    const occ = ajouterJours(ajouterJours(mondayOf(debut), w * 7), creneau.jour);
    if (occ >= debut) dates.push(occ);
  }
  return dates;
}

function formulaireDepuis(open: PlanModalOpen): Form {
  if (open.mode === "edit") {
    const plan = open.plan;
    const aSections = !!plan.sections;
    return {
      nom: plan.nom,
      theme: plan.theme,
      dateDebut: toDateInputValue(new Date(plan.dateDebut)),
      dureeSemaines: dureeEnSemaines(plan.dateDebut, plan.dateFin),
      groupeIds: plan.groupes.map((g) => g.id),
      mode: aSections ? "manuel" : "auto",
      heureDebut: plan.heureDebut ?? "18:00",
      combos:
        plan.combos && plan.combos.length > 0
          ? plan.combos
          : plan.variant && plan.intensite && plan.nage
            ? [
                {
                  variant: [{ valeur: plan.variant, pourcentage: 100 }],
                  intensite: [{ valeur: plan.intensite, pourcentage: 100 }],
                  nage: [{ valeur: plan.nage, pourcentage: 100 }],
                  pourcentage: 100,
                },
              ]
            : contenuVide().combos,
      volume: plan.volumeNage ?? 3000,
      sections: plan.sections ?? [nouvelleSection("Échauffement")],
    };
  }
  return {
    ...contenuVide(),
    nom: open.presetTheme,
    theme: open.presetTheme,
    dateDebut: toDateInputValue(open.presetDate),
    dureeSemaines: 4,
    groupeIds: [open.groupeId],
  };
}

// Fenêtre de création/édition d'un plan d'entraînement — partagée entre la
// grille par objectif (Entraînement) et le calendrier multi-semaines par
// groupe, pour qu'un plan s'édite exactement pareil des deux écrans.
export function PlanModal({
  open,
  onClose,
  groupesParPole,
  creneauxParGroupe,
  modeles,
  onSaved,
}: {
  open: PlanModalOpen;
  onClose: () => void;
  groupesParPole: Section[];
  creneauxParGroupe: Record<string, CreneauLite[]>;
  modeles: Modele[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const toutGroupes = groupesParPole.flatMap((s) => s.groupes);
  const [form, setForm] = useState<Form>(() => formulaireDepuis(open));
  const [saving, setSaving] = useState(false);

  function toggleGroupe(id: string) {
    setForm((f) => ({ ...f, groupeIds: f.groupeIds.includes(id) ? f.groupeIds.filter((x) => x !== id) : [...f.groupeIds, id] }));
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

  async function enregistrer() {
    if (!form.nom.trim() || form.groupeIds.length === 0) return;
    setSaving(true);
    try {
      const isEdit = open.mode === "edit";
      const payload: Record<string, unknown> = {
        nom: form.nom.trim(),
        theme: form.theme,
        dateDebut: form.dateDebut,
        dureeSemaines: form.dureeSemaines,
        groupeIds: form.groupeIds,
        heureDebut: form.heureDebut,
      };
      if (form.mode === "manuel") {
        payload.sections = form.sections;
        if (isEdit) {
          payload.combos = null;
          payload.variant = null;
          payload.intensite = null;
          payload.nage = null;
          payload.volumeNage = null;
        }
      } else {
        payload.combos = form.combos;
        payload.volumeNage = form.volume;
        if (isEdit) payload.sections = null;
      }

      if (isEdit) {
        await fetch(`/api/plans-entrainement/${open.plan.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/plans-entrainement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function supprimer() {
    if (open.mode !== "edit") return;
    await fetch(`/api/plans-entrainement/${open.plan.id}`, { method: "DELETE" });
    onSaved();
    onClose();
  }

  const blocsApercu = form.mode === "auto" ? genererSeanceMulti(form.combos, form.volume || 0).blocs : buildManualBlocs(form.heureDebut, form.sections);
  const combosValides = combosValidesPour(form);
  const seancesApercu = form.groupeIds
    .flatMap((gid) => (creneauxParGroupe[gid] ?? []).map((c) => ({ gid, c })))
    .flatMap(({ gid, c }) => occurrences(c, form.dateDebut, form.dureeSemaines).map((date) => ({ date, creneau: c, groupeNom: toutGroupes.find((g) => g.id === gid)?.nom ?? "" })))
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.creneau.debut.localeCompare(b.creneau.debut))
    .slice(0, SEMAINES_APERCU * 3);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 780, maxHeight: "90vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
        <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
          <h2 className="font-display text-[20px] tracking-[0.05em]">{open.mode === "new" ? "Nouveau plan d'entraînement" : "Modifier le plan"}</h2>
          <div className="flex items-center gap-2.5">
            <Link href="/outils/allures" target="_blank" className="text-[12px] font-semibold underline" style={{ color: "#7FDCFF" }}>
              Tableaux d&apos;allures →
            </Link>
            <button onClick={onClose} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                Nom du plan
              </div>
              <input
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="ex. Bloc jambes octobre"
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              />
            </div>
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                Objectif (macro)
              </div>
              <select
                value={form.theme}
                onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: couleurObjectif(form.theme) }}
              >
                {OBJECTIFS.map((o) => (
                  <option key={o.nom} value={o.nom} style={{ background: "#101A2B", color: o.color }}>
                    {o.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                Date de début
              </div>
              <input
                type="date"
                value={form.dateDebut}
                onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              />
            </div>
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                Durée (semaines)
              </div>
              <input
                type="number"
                min={1}
                value={form.dureeSemaines}
                onChange={(e) => setForm((f) => ({ ...f, dureeSemaines: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              />
            </div>
          </div>

          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
              Groupes concernés
            </div>
            <div className="flex flex-col gap-2">
              {groupesParPole.map((section) => (
                <div key={section.pole} className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] mr-1" style={{ color: section.color }}>
                    {section.nom}
                  </span>
                  {section.groupes.map((g) => {
                    const actif = form.groupeIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGroupe(g.id)}
                        className="rounded-full px-3 py-1 text-[12px] font-semibold cursor-pointer"
                        style={{
                          background: actif ? "linear-gradient(135deg,#1E7BFF,#0F5FD6)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${actif ? "transparent" : "var(--border)"}`,
                          color: actif ? "#fff" : "var(--ink-body)",
                        }}
                      >
                        {g.nom}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <SeanceContenuEditor value={form} onChange={(updater) => setForm((f) => ({ ...f, ...updater(f) }))} modeles={modeles} onEnregistrerModele={enregistrerModeleDepuisForm} />

          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
              Aperçu — les séances que ce plan va générer
            </div>
            <div className="flex flex-col gap-1.5 rounded-xl p-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", maxHeight: 260, overflowY: "auto" }}>
              {seancesApercu.length === 0 && (
                <div className="text-[12px] px-2 py-2" style={{ color: "var(--ink-secondary)" }}>
                  Sélectionne au moins un groupe ayant un créneau régulier pour voir l&apos;aperçu.
                </div>
              )}
              {seancesApercu.map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-[11px] font-semibold shrink-0" style={{ width: 150, color: "var(--ink-body)" }}>
                    {fmtDateCourte(s.date)} · {s.creneau.debut} · {s.groupeNom}
                  </div>
                  <div className="flex-1 min-w-0 text-[11px] truncate" style={{ color: "var(--ink-secondary)" }}>
                    {blocsApercu.map((b) => `${b.phase} (${b.distance})`).join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex gap-2.5" style={{ borderTop: "1px solid var(--border)" }}>
          {open.mode === "edit" && (
            <button onClick={supprimer} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid rgba(232,68,43,0.35)", color: "#FF9179" }}>
              Supprimer
            </button>
          )}
          <button
            onClick={enregistrer}
            disabled={saving || !form.nom.trim() || form.groupeIds.length === 0 || !combosValides}
            className="flex-1 rounded-[10px] py-2.5 text-[13px] font-bold cursor-pointer"
            style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving || !form.nom.trim() || form.groupeIds.length === 0 || !combosValides ? 0.6 : 1 }}
          >
            {saving ? "Enregistrement…" : open.mode === "new" ? "+ Créer le plan" : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
