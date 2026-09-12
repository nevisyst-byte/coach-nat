"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
import { genererSeance, genererSeanceMulti, type Bloc } from "@/lib/seance-generator";
import { buildManualBlocs } from "@/lib/seance-manual";
import { mondayOf, toDateInputValue } from "@/lib/week";
import { JOURS } from "@/lib/format";
import { PlanModal, type Groupe, type Section, type CreneauLite, type Plan, type PlanModalOpen } from "./PlanModal";
import type { Modele } from "./SeanceContenuEditor";

const SEMAINES_AFFICHEES = 16;
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const LARGEUR_COLONNE = 180;

function ajouterJours(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function memeJour(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function estDetaille(p: Plan) {
  return !!p.sections || !!(p.volumeNage && ((p.combos && p.combos.length > 0) || (p.variant && p.intensite && p.nage)));
}
function contenuPourPlan(plan: Plan): Bloc[] | null {
  if (plan.sections && plan.sections.length > 0) return buildManualBlocs(plan.heureDebut ?? "17:00", plan.sections);
  if (plan.combos && plan.combos.length > 0 && plan.volumeNage) return genererSeanceMulti(plan.combos, plan.volumeNage).blocs;
  if (plan.variant && plan.intensite && plan.nage && plan.volumeNage) return genererSeance(plan.variant, plan.intensite, plan.nage, plan.volumeNage).blocs;
  return null;
}
function fmtDateCourte(d: Date) {
  return `${JOURS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function EntrainementClient({
  groupesParPole,
  plans,
  creneauxParGroupe,
  modeles,
}: {
  groupesParPole: Section[];
  plans: Plan[];
  creneauxParGroupe: Record<string, CreneauLite[]>;
  modeles: Modele[];
}) {
  const router = useRouter();
  const lundiCourant = mondayOf(new Date());
  const semaines = Array.from({ length: SEMAINES_AFFICHEES }, (_, i) => ajouterJours(lundiCourant, i * 7));
  const toutGroupes = groupesParPole.flatMap((s) => s.groupes);

  // Présélectionne le premier groupe disponible : s'il en existe un, la
  // page ne doit jamais s'ouvrir vide sur "Merci de sélectionner..."
  const [selectedGroupeIds, setSelectedGroupeIds] = useState<string[]>(toutGroupes[0] ? [toutGroupes[0].id] : []);
  const groupesSelectionnes = toutGroupes.filter((g) => selectedGroupeIds.includes(g.id));

  function toggleSelectionGroupe(id: string) {
    setSelectedGroupeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const [modalOpen, setModalOpen] = useState<PlanModalOpen | null>(null);

  function plansDuGroupe(groupeId: string) {
    return plans.filter((p) => p.groupes.some((g) => g.id === groupeId));
  }

  // On ne montre que les objectifs déjà planifiés pour ce groupe : sur les 7
  // objectifs possibles, un groupe n'en travaille en général que 2-3, inutile
  // de réserver une ligne pour les autres. "+ Ajouter un objectif" ouvre le
  // même formulaire pour en démarrer un nouveau.
  function objectifsDuGroupe(groupeId: string) {
    const themes = new Set(plansDuGroupe(groupeId).map((p) => p.theme));
    return OBJECTIFS.filter((o) => themes.has(o.nom));
  }

  function planPourCellule(groupeId: string, themeNom: string, semaine: Date) {
    return plansDuGroupe(groupeId).find((p) => p.theme === themeNom && new Date(p.dateDebut) <= semaine && semaine <= new Date(p.dateFin));
  }

  function ouvrirNouveau(groupe: Groupe, themeNom: string, semaine: Date) {
    const dernierePourTheme = plansDuGroupe(groupe.id).filter((p) => p.theme === themeNom).sort((a, b) => a.dateFin.localeCompare(b.dateFin)).at(-1);
    const debutParDefaut = dernierePourTheme ? ajouterJours(new Date(dernierePourTheme.dateFin), 1) : semaine;
    setModalOpen({ mode: "new", presetTheme: themeNom, presetDate: debutParDefaut, groupeId: groupe.id });
  }

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
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
          Choisis un ou plusieurs groupes, puis clique une semaine sur la ligne de l&apos;objectif voulu pour y planifier
          un plan d&apos;entraînement — variant, intensité et nage (ou une saisie manuelle) définissent le contenu,
          appliqué automatiquement à chaque créneau réel du groupe sur la période.
        </div>
        <Link href="/entrainement/planning" className="text-[13px] font-semibold shrink-0" style={{ color: "#7FDCFF" }}>
          Calendrier des plans par groupe →
        </Link>
      </div>

      <div className="flex flex-col gap-2.5">
        {groupesParPole.map((section) => (
          <div key={section.pole} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full" style={{ background: section.color }} />
              <span className="font-display text-[12px] tracking-[0.08em] uppercase" style={{ color: "var(--ink-tertiary)" }}>
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
        const objectifsGroupe = objectifsDuGroupe(groupe.id);
        const objectifsRestants = OBJECTIFS.filter((o) => !objectifsGroupe.includes(o));
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
                    <div className="shrink-0 px-3.5 py-2.5 text-[11px] tracking-[0.1em] uppercase" style={{ width: LARGEUR_COLONNE, color: "var(--ink-tertiary)" }}>
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

                  {objectifsGroupe.map((objectif) => (
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
                            onClick={() => (plan ? setModalOpen({ mode: "edit", plan }) : ouvrirNouveau(groupe, objectif.nom, s))}
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
              {objectifsGroupe.length === 0 && (
                <div className="px-3.5 py-3 text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Aucun objectif planifié pour ce groupe pour le moment.
                </div>
              )}
              {objectifsRestants.length > 0 && (
                <button
                  onClick={() => ouvrirNouveau(groupe, objectifsRestants[0].nom, lundiCourant)}
                  className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold cursor-pointer"
                  style={{ color: "#7FDCFF" }}
                >
                  + Ajouter un objectif
                </button>
              )}
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

      {modalOpen && (
        <PlanModal open={modalOpen} onClose={() => setModalOpen(null)} groupesParPole={groupesParPole} creneauxParGroupe={creneauxParGroupe} modeles={modeles} onSaved={() => router.refresh()} />
      )}
    </div>
  );
}
