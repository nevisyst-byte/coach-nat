"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Chip } from "@/components/ui/Card";
import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
import { genererSeance, type Bloc } from "@/lib/seance-generator";
import { nouvelleSection, buildManualBlocs, volumeTotalManuel, fmtDistance, type SectionManuelle } from "@/lib/seance-manual";
import { SectionsEditor } from "./SectionsEditor";
import { mondayOf, toDateInputValue } from "@/lib/week";
import { JOURS } from "@/lib/format";

const SEMAINES_AFFICHEES = 16;
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const LARGEUR_COLONNE = 180;

const AXES = [
  { key: "variant" as const, titre: "Variant", aide: "Support technique", options: ["Nage complète", "Bras", "Jambes", "Éducatif"] },
  { key: "intensite" as const, titre: "Intensité", aide: "Allure de travail", options: ["Allure neutre", "Négatif split", "Progressif", "Seuil", "Allure 400", "Allure 200", "Vitesse"] },
  { key: "nage" as const, titre: "Nages", aide: "Support de nage", options: ["4 nages", "Spécialité", "Papillon", "Dos", "Brasse", "Crawl"] },
];

type Groupe = { id: string; nom: string };
type Section = { pole: string; nom: string; color: string; groupes: Groupe[] };
type CreneauLite = { id: string; jour: number; debut: string };
type Plan = {
  id: string;
  nom: string;
  theme: string;
  heureDebut: string | null;
  variant: string | null;
  intensite: string | null;
  nage: string | null;
  volumeNage: number | null;
  sections: SectionManuelle[] | null;
  dateDebut: string;
  dateFin: string;
  groupes: Groupe[];
};

type Form = {
  nom: string;
  theme: string;
  dateDebut: string;
  dureeSemaines: number;
  groupeIds: string[];
  mode: "auto" | "manuel";
  heureDebut: string;
  variant: string;
  intensite: string;
  nage: string;
  volume: number;
  sections: SectionManuelle[];
};

type Modal = { mode: "new" | "edit"; planId?: string } | null;

function ajouterJours(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function memeJour(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dureeEnSemaines(dateDebut: string, dateFin: string) {
  const jours = Math.round((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000) + 1;
  return Math.max(1, Math.round(jours / 7));
}
function estDetaille(p: Plan) {
  return !!p.sections || !!(p.variant && p.intensite && p.nage && p.volumeNage);
}
function contenuPourPlan(plan: Plan): Bloc[] | null {
  if (plan.sections && plan.sections.length > 0) return buildManualBlocs(plan.heureDebut ?? "17:00", plan.sections);
  if (plan.variant && plan.intensite && plan.nage && plan.volumeNage) return genererSeance(plan.variant, plan.intensite, plan.nage, plan.volumeNage).blocs;
  return null;
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
function fmtDateCourte(d: Date) {
  return `${JOURS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function EntrainementClient({
  groupesParPole,
  plans,
  creneauxParGroupe,
}: {
  groupesParPole: Section[];
  plans: Plan[];
  creneauxParGroupe: Record<string, CreneauLite[]>;
}) {
  const router = useRouter();
  const lundiCourant = mondayOf(new Date());
  const semaines = Array.from({ length: SEMAINES_AFFICHEES }, (_, i) => ajouterJours(lundiCourant, i * 7));
  const toutGroupes = groupesParPole.flatMap((s) => s.groupes);

  const [selectedGroupeIds, setSelectedGroupeIds] = useState<string[]>([]);
  const groupesSelectionnes = toutGroupes.filter((g) => selectedGroupeIds.includes(g.id));

  function toggleSelectionGroupe(id: string) {
    setSelectedGroupeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState<Form>(formulaireVide());
  const [saving, setSaving] = useState(false);

  function formulaireVide(presetTheme?: string, presetDate?: Date, groupeId?: string): Form {
    return {
      nom: presetTheme ?? "",
      theme: presetTheme ?? OBJECTIFS[0].nom,
      dateDebut: toDateInputValue(presetDate ?? lundiCourant),
      dureeSemaines: 4,
      groupeIds: groupeId ? [groupeId] : [],
      mode: "auto",
      heureDebut: "18:00",
      variant: AXES[0].options[0],
      intensite: AXES[1].options[0],
      nage: AXES[2].options[0],
      volume: 3000,
      sections: [nouvelleSection("Échauffement")],
    };
  }

  function plansDuGroupe(groupeId: string) {
    return plans.filter((p) => p.groupes.some((g) => g.id === groupeId));
  }

  function planPourCellule(groupeId: string, themeNom: string, semaine: Date) {
    return plansDuGroupe(groupeId).find((p) => p.theme === themeNom && new Date(p.dateDebut) <= semaine && semaine <= new Date(p.dateFin));
  }

  function ouvrirNouveau(groupe: Groupe, themeNom: string, semaine: Date) {
    const dernierePourTheme = plansDuGroupe(groupe.id).filter((p) => p.theme === themeNom).sort((a, b) => a.dateFin.localeCompare(b.dateFin)).at(-1);
    const debutParDefaut = dernierePourTheme ? ajouterJours(new Date(dernierePourTheme.dateFin), 1) : semaine;
    setForm(formulaireVide(themeNom, debutParDefaut, groupe.id));
    setModal({ mode: "new" });
  }

  function ouvrirEdition(plan: Plan) {
    const aSections = !!plan.sections;
    setForm({
      nom: plan.nom,
      theme: plan.theme,
      dateDebut: toDateInputValue(new Date(plan.dateDebut)),
      dureeSemaines: dureeEnSemaines(plan.dateDebut, plan.dateFin),
      groupeIds: plan.groupes.map((g) => g.id),
      mode: aSections ? "manuel" : "auto",
      heureDebut: plan.heureDebut ?? "18:00",
      variant: plan.variant ?? AXES[0].options[0],
      intensite: plan.intensite ?? AXES[1].options[0],
      nage: plan.nage ?? AXES[2].options[0],
      volume: plan.volumeNage ?? 3000,
      sections: plan.sections ?? [nouvelleSection("Échauffement")],
    });
    setModal({ mode: "edit", planId: plan.id });
  }

  function toggleGroupe(id: string) {
    setForm((f) => ({ ...f, groupeIds: f.groupeIds.includes(id) ? f.groupeIds.filter((x) => x !== id) : [...f.groupeIds, id] }));
  }

  async function enregistrer() {
    if (!form.nom.trim() || form.groupeIds.length === 0) return;
    setSaving(true);
    try {
      const isEdit = modal?.mode === "edit";
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
          payload.variant = null;
          payload.intensite = null;
          payload.nage = null;
          payload.volumeNage = null;
        }
      } else {
        payload.variant = form.variant;
        payload.intensite = form.intensite;
        payload.nage = form.nage;
        payload.volumeNage = form.volume;
        if (isEdit) payload.sections = null;
      }

      if (modal?.mode === "edit" && modal.planId) {
        await fetch(`/api/plans-entrainement/${modal.planId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/plans-entrainement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      router.refresh();
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function supprimer() {
    if (modal?.mode !== "edit" || !modal.planId) return;
    await fetch(`/api/plans-entrainement/${modal.planId}`, { method: "DELETE" });
    router.refresh();
    setModal(null);
  }

  // Aperçu concret du plan en cours de saisie : les vraies dates de créneaux
  // des groupes choisis sur la période, avec le contenu qui y apparaîtra —
  // pour qu'un plan ne reste jamais une coquille abstraite.
  const blocsApercu = form.mode === "auto" ? genererSeance(form.variant, form.intensite, form.nage, form.volume || 0).blocs : buildManualBlocs(form.heureDebut, form.sections);
  const seancesApercu = form.groupeIds
    .flatMap((gid) => (creneauxParGroupe[gid] ?? []).map((c) => ({ gid, c })))
    .flatMap(({ gid, c }) => occurrences(c, form.dateDebut, form.dureeSemaines).map((date) => ({ date, creneau: c, groupeNom: toutGroupes.find((g) => g.id === gid)?.nom ?? "" })))
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.creneau.debut.localeCompare(b.creneau.debut));

  // Prochaines séances réelles d'un groupe, à partir des plans déjà
  // enregistrés — pour voir concrètement ce qui est programmé sans avoir à
  // ouvrir Présences créneau par créneau.
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  function prochainesSeancesPourGroupe(groupeId: string) {
    const plansGroupe = plansDuGroupe(groupeId);
    return (creneauxParGroupe[groupeId] ?? [])
      .flatMap((c) =>
        Array.from({ length: SEMAINES_AFFICHEES }, (_, w) => ajouterJours(ajouterJours(lundiCourant, w * 7), c.jour))
          .filter((date) => date >= aujourdhui)
          .map((date) => ({ date, creneau: c }))
      )
      .map(({ date, creneau }) => ({
        date,
        creneau,
        plan: plansGroupe.find((p) => new Date(p.dateDebut) <= date && date <= new Date(p.dateFin)) ?? null,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime() || a.creneau.debut.localeCompare(b.creneau.debut))
      .slice(0, 12);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
        Choisis un ou plusieurs groupes, puis clique une semaine sur la ligne de l&apos;objectif voulu pour y planifier
        un plan d&apos;entraînement — variant, intensité et nage (ou une saisie manuelle) définissent le contenu,
        appliqué automatiquement à chaque créneau réel du groupe sur la période.
      </div>

      <div className="flex flex-col gap-2.5">
        {groupesParPole.map((section) => (
          <div key={section.pole} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full" style={{ background: section.color }} />
              <span className="font-display text-[12px] tracking-[0.08em] uppercase" style={{ color: "#61789B" }}>
                {section.nom}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {section.groupes.map((groupe) => {
                const actif = selectedGroupeIds.includes(groupe.id);
                return (
                  <button
                    key={groupe.id}
                    onClick={() => toggleSelectionGroupe(groupe.id)}
                    className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold cursor-pointer"
                    style={{
                      background: actif ? "linear-gradient(135deg,#1E7BFF,#0F5FD6)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${actif ? "transparent" : "var(--border)"}`,
                      color: actif ? "#fff" : "var(--ink-body)",
                    }}
                  >
                    {groupe.nom}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {groupesSelectionnes.length === 0 && (
        <div className="rounded-2xl py-10 text-center text-[14px] font-semibold" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-secondary)" }}>
          Merci de sélectionner votre groupe.
        </div>
      )}

      {groupesSelectionnes.map((groupe) => {
        const prochainesSeances = prochainesSeancesPourGroupe(groupe.id);
        return (
          <div key={groupe.id} className="flex flex-col gap-3.5">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-3.5 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                <span className="font-display text-[15px] tracking-[0.03em]">{groupe.nom}</span>
                <span className="text-[11px]" style={{ color: "var(--ink-secondary)" }}>
                  ✦ = détaillé (contenu chiffré) · clique une case pour planifier ou éditer
                </span>
              </div>
              <div className="overflow-x-auto">
                <div style={{ minWidth: LARGEUR_COLONNE + SEMAINES_AFFICHEES * 56 }}>
                  <div className="flex" style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="shrink-0 px-3.5 py-2.5 text-[10px] tracking-[0.1em] uppercase" style={{ width: LARGEUR_COLONNE, color: "#61789B" }}>
                      Objectif
                    </div>
                    {semaines.map((s, i) => (
                      <div
                        key={i}
                        className="shrink-0 text-center py-2.5 text-[10px]"
                        style={{ width: 56, color: memeJour(s, lundiCourant) ? "#24C8FF" : "#61789B", fontWeight: memeJour(s, lundiCourant) ? 700 : 400 }}
                      >
                        {s.getDate()} {MOIS[s.getMonth()]}
                      </div>
                    ))}
                  </div>

                  {OBJECTIFS.map((objectif) => (
                    <div key={objectif.nom} className="flex items-stretch" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div style={{ width: LARGEUR_COLONNE }} className="shrink-0 px-3.5 py-2.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: objectif.color }} />
                        <span className="text-sm font-semibold truncate">{objectif.nom}</span>
                      </div>
                      {semaines.map((s, i) => {
                        const plan = planPourCellule(groupe.id, objectif.nom, s);
                        return (
                          <div
                            key={i}
                            className="shrink-0 flex items-center justify-center"
                            style={{ width: 56, padding: "6px 3px", cursor: "pointer" }}
                            onClick={() => (plan ? ouvrirEdition(plan) : ouvrirNouveau(groupe, objectif.nom, s))}
                            title={plan ? `${plan.nom}${estDetaille(plan) ? " (détaillé)" : ""} — semaine du ${s.getDate()}/${s.getMonth() + 1}` : `Planifier « ${objectif.nom} » sur cette semaine`}
                          >
                            <div
                              className="w-full rounded flex items-center justify-center"
                              style={{
                                height: 22,
                                background: plan ? `${objectif.color}55` : "rgba(255,255,255,0.03)",
                                border: `1px solid ${memeJour(s, lundiCourant) ? "#24C8FF" : plan ? objectif.color : "var(--border)"}`,
                              }}
                            >
                              {plan && estDetaille(plan) && <span style={{ fontSize: 10, color: objectif.color }}>✦</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-3.5 py-2.5" style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                <span className="font-display text-[15px] tracking-[0.03em]">Prochaines séances — {groupe.nom}</span>
              </div>
              <div className="flex flex-col" style={{ maxHeight: 360, overflowY: "auto" }}>
                {prochainesSeances.length === 0 && (
                  <div className="px-3.5 py-4 text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                    Aucun créneau régulier pour ce groupe.
                  </div>
                )}
                {prochainesSeances.map(({ date, creneau, plan }, i) => {
                  const blocs = plan ? contenuPourPlan(plan) : null;
                  return (
                    <Link
                      key={i}
                      href={`/presences?slot=reg:${creneau.id}&date=${toDateInputValue(date)}`}
                      className="flex items-center gap-3 px-3.5 py-2.5"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <div className="text-[12px] font-semibold shrink-0" style={{ width: 130, color: "var(--ink-body)" }}>
                        {fmtDateCourte(date)} · {creneau.debut}
                      </div>
                      <div className="flex-1 min-w-0 text-[12px] truncate" style={{ color: plan ? "var(--ink-secondary)" : "var(--ink-muted)" }}>
                        {plan ? (
                          blocs ? (
                            blocs.map((b) => b.phase).join(" · ")
                          ) : (
                            <span style={{ color: couleurObjectif(plan.theme) }}>{plan.theme} (pas encore détaillé)</span>
                          )
                        ) : (
                          "Aucun plan programmé"
                        )}
                      </div>
                      <span className="text-[11px] shrink-0" style={{ color: "#7FDCFF" }}>
                        Voir →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {modal && (
        <div onClick={() => setModal(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 780, maxHeight: "90vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[20px] tracking-[0.05em]">{modal.mode === "new" ? "Nouveau plan d'entraînement" : "Modifier le plan"}</h2>
              <button onClick={() => setModal(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
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

              <div className="flex flex-col gap-3.5 rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-2">
                    <Chip active={form.mode === "auto"} onClick={() => setForm((f) => ({ ...f, mode: "auto" }))}>
                      Variant · Intensité · Nage
                    </Chip>
                    <Chip active={form.mode === "manuel"} onClick={() => setForm((f) => ({ ...f, mode: "manuel" }))}>
                      Saisie manuelle
                    </Chip>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[11px]" style={{ color: "#61789B" }}>
                      Heure de début
                    </span>
                    <input
                      type="time"
                      value={form.heureDebut}
                      onChange={(e) => setForm((f) => ({ ...f, heureDebut: e.target.value }))}
                      className="rounded-[9px] px-2.5 py-1.5 text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                    />
                  </div>
                </div>

                {form.mode === "auto" ? (
                  <>
                    {AXES.map((ax) => (
                      <div key={ax.key}>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-[11px] tracking-[0.1em] uppercase" style={{ color: "#61789B" }}>
                            {ax.titre}
                          </span>
                          <span className="text-[11px]" style={{ color: "#61789B" }}>
                            {ax.aide}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ax.options.map((o) => (
                            <Chip key={o} active={form[ax.key] === o} onClick={() => setForm((f) => ({ ...f, [ax.key]: o }))}>
                              {o}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div>
                      <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                        Volume cible (m)
                      </div>
                      <input
                        type="number"
                        min={100}
                        step={50}
                        value={form.volume}
                        onChange={(e) => setForm((f) => ({ ...f, volume: parseInt(e.target.value, 10) || 0 }))}
                        className="rounded-[9px] px-3 py-2.5 text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)", width: 160 }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <SectionsEditor sections={form.sections} onChange={(sections) => setForm((f) => ({ ...f, sections }))} />
                    <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                      Total : <strong style={{ color: "var(--ink)" }}>{fmtDistance(volumeTotalManuel(form.sections))}</strong>
                    </div>
                  </>
                )}
              </div>

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
              {modal.mode === "edit" && (
                <button onClick={supprimer} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid rgba(232,68,43,0.35)", color: "#FF9179" }}>
                  Supprimer
                </button>
              )}
              <button
                onClick={enregistrer}
                disabled={saving || !form.nom.trim() || form.groupeIds.length === 0}
                className="flex-1 rounded-[10px] py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving || !form.nom.trim() || form.groupeIds.length === 0 ? 0.6 : 1 }}
              >
                {saving ? "Enregistrement…" : modal.mode === "new" ? "+ Créer le plan" : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
