"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
import { mondayOf, toDateInputValue } from "@/lib/week";
import { genererSeance, genererSeanceMulti, type Bloc } from "@/lib/seance-generator";
import { buildManualBlocs } from "@/lib/seance-manual";
import { JOURS } from "@/lib/format";
import { semaineEnVacances, type ZoneScolaire } from "@/lib/vacances-scolaires";
import { PlanModal, type Section, type CreneauLite, type Plan, type PlanModalOpen } from "./PlanModal";

const SEMAINES_AFFICHEES = 16;
const LARGEUR_LABEL = 140;
const LARGEUR_SEMAINE = 64;
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function ajouterJours(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function joursEntre(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
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

export function PlanningEntrainementClient({
  groupesParPole,
  plans,
  creneauxParGroupe,
  zone,
}: {
  groupesParPole: Section[];
  plans: Plan[];
  creneauxParGroupe: Record<string, CreneauLite[]>;
  zone: ZoneScolaire;
}) {
  const router = useRouter();
  const toutGroupes = groupesParPole.flatMap((s) => s.groupes);
  const [groupeId, setGroupeId] = useState<string>(toutGroupes[0]?.id ?? "");
  const [modalOpen, setModalOpen] = useState<PlanModalOpen | null>(null);
  const [decalageSemaines, setDecalageSemaines] = useState(0);

  const lundiCourant = ajouterJours(mondayOf(new Date()), decalageSemaines * 7);
  const semaines = Array.from({ length: SEMAINES_AFFICHEES }, (_, i) => ajouterJours(lundiCourant, i * 7));
  const vacancesParSemaine = semaines.map((s) => semaineEnVacances(Array.from({ length: 7 }, (_, d) => ajouterJours(s, d)), zone));
  const fenetreFin = ajouterJours(lundiCourant, SEMAINES_AFFICHEES * 7);
  const dernierJourAffiche = ajouterJours(fenetreFin, -1);
  const libellePeriode =
    lundiCourant.getFullYear() === dernierJourAffiche.getFullYear()
      ? `${MOIS[lundiCourant.getMonth()]} – ${MOIS[dernierJourAffiche.getMonth()]} ${lundiCourant.getFullYear()}`
      : `${MOIS[lundiCourant.getMonth()]} ${lundiCourant.getFullYear()} – ${MOIS[dernierJourAffiche.getMonth()]} ${dernierJourAffiche.getFullYear()}`;

  const groupe = toutGroupes.find((g) => g.id === groupeId) ?? null;
  const plansGroupe = groupe
    ? plans.filter((p) => p.groupes.some((g) => g.id === groupe.id)).sort((a, b) => a.dateDebut.localeCompare(b.dateDebut))
    : [];

  // Prochaines séances réelles du groupe, à partir des plans déjà
  // enregistrés — pour voir concrètement ce qui est programmé sans avoir à
  // ouvrir Présences créneau par créneau. Toujours à partir d'aujourd'hui,
  // indépendamment de la période affichée par le calendrier ci-dessus.
  const lundiAujourdhui = mondayOf(new Date());
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const prochainesSeances = groupe
    ? (creneauxParGroupe[groupe.id] ?? [])
        .flatMap((c) =>
          Array.from({ length: SEMAINES_AFFICHEES }, (_, w) => ajouterJours(ajouterJours(lundiAujourdhui, w * 7), c.jour))
            .filter((date) => date >= aujourdhui)
            .map((date) => ({ date, creneau: c }))
        )
        .map(({ date, creneau }) => ({
          date,
          creneau,
          plan: plansGroupe.find((p) => new Date(p.dateDebut) <= date && date <= new Date(p.dateFin)) ?? null,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime() || a.creneau.debut.localeCompare(b.creneau.debut))
        .slice(0, 12)
    : [];

  function barreStyle(plan: Plan) {
    const debut = new Date(plan.dateDebut);
    const fin = ajouterJours(new Date(plan.dateFin), 1);
    const debutVisible = debut < lundiCourant ? lundiCourant : debut;
    const finVisible = fin > fenetreFin ? fenetreFin : fin;
    if (finVisible <= debutVisible) return null;
    const left = (joursEntre(lundiCourant, debutVisible) / 7) * LARGEUR_SEMAINE;
    const width = (joursEntre(debutVisible, finVisible) / 7) * LARGEUR_SEMAINE;
    return { left, width: Math.max(width - 4, 8) };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
        Vue calendaire d&apos;un groupe : chaque ligne est un plan d&apos;entraînement déjà enregistré (nom libre, objectif et
        durée choisis à sa création), positionné sur ses vraies dates — clique sa barre pour l&apos;éditer. Clique une case
        vide sur la même ligne (ex. en janvier pour « Reprise ») pour reprendre ce plan sur une nouvelle période. Utilise
        la dernière ligne pour en enregistrer un nouveau. Les semaines de vacances scolaires sont surlignées 🏖.
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] tracking-[0.12em] uppercase" style={{ color: "var(--ink-tertiary)" }}>
            Groupe
          </span>
          <select
            value={groupeId}
            onChange={(e) => setGroupeId(e.target.value)}
            className="rounded-[9px] px-3 py-2 text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
          >
            {groupesParPole.map((section) => (
              <optgroup key={section.pole} label={section.nom}>
                {section.groupes.map((g) => (
                  <option key={g.id} value={g.id} style={{ background: "#101A2B" }}>
                    {g.nom}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDecalageSemaines((d) => d - SEMAINES_AFFICHEES)}
            className="w-[30px] h-[30px] rounded-[9px] cursor-pointer text-sm"
            style={{ border: "1px solid var(--border-strong)", color: "var(--ink-body)" }}
            title="Période précédente"
          >
            ‹
          </button>
          <span className="text-[13px] font-semibold min-w-[150px] text-center" style={{ color: "var(--ink-body)" }}>
            {libellePeriode}
          </span>
          <button
            onClick={() => setDecalageSemaines((d) => d + SEMAINES_AFFICHEES)}
            className="w-[30px] h-[30px] rounded-[9px] cursor-pointer text-sm"
            style={{ border: "1px solid var(--border-strong)", color: "var(--ink-body)" }}
            title="Période suivante"
          >
            ›
          </button>
          {decalageSemaines !== 0 && (
            <button
              onClick={() => setDecalageSemaines(0)}
              className="text-[12px] font-semibold underline cursor-pointer"
              style={{ color: "#7FDCFF" }}
            >
              Aujourd&apos;hui
            </button>
          )}
        </div>
      </div>

      {!groupe ? (
        <div className="rounded-2xl py-10 text-center text-[14px] font-semibold" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-secondary)" }}>
          Aucun groupe disponible.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-x-auto">
              <div style={{ minWidth: LARGEUR_LABEL + SEMAINES_AFFICHEES * LARGEUR_SEMAINE }}>
                <div className="flex" style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="shrink-0 px-3.5 py-2.5 text-[12px] tracking-[0.1em] uppercase" style={{ width: LARGEUR_LABEL, color: "var(--ink-tertiary)" }}>
                    Plan
                  </div>
                  {semaines.map((s, i) => (
                    <div
                      key={i}
                      className="shrink-0 text-center py-2.5 text-[12px]"
                      style={{ width: LARGEUR_SEMAINE, color: "var(--ink-tertiary)", background: vacancesParSemaine[i] ? "rgba(242,179,61,0.14)" : undefined }}
                      title={vacancesParSemaine[i]?.nom}
                    >
                      {s.getDate()} {MOIS[s.getMonth()]}
                      {vacancesParSemaine[i] && " 🏖"}
                    </div>
                  ))}
                </div>

                {plansGroupe.map((p) => {
                  const style = barreStyle(p);
                  const color = couleurObjectif(p.theme);
                  return (
                    <div key={p.id} className="flex items-stretch" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div style={{ width: LARGEUR_LABEL }} className="shrink-0 px-3.5 py-2.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-sm font-semibold truncate" title={p.nom}>
                          {p.nom}
                        </span>
                      </div>
                      <div className="relative flex" style={{ height: 44, width: SEMAINES_AFFICHEES * LARGEUR_SEMAINE }}>
                        {semaines.map((s, i) => (
                          <div
                            key={i}
                            className="shrink-0 cursor-pointer"
                            style={{
                              width: LARGEUR_SEMAINE,
                              height: "100%",
                              borderLeft: i > 0 ? "1px solid var(--border)" : undefined,
                              background: vacancesParSemaine[i] ? "rgba(242,179,61,0.09)" : undefined,
                            }}
                            title={`Dupliquer « ${p.nom} » à partir de cette semaine`}
                            onClick={() => setModalOpen({ mode: "duplicate", plan: p, presetDate: s })}
                          />
                        ))}
                        {style && (
                          <button
                            onClick={() => setModalOpen({ mode: "edit", plan: p })}
                            className="absolute rounded-md px-2 flex items-center text-[12px] font-semibold truncate cursor-pointer"
                            style={{ top: 8, height: 28, left: style.left + 2, width: style.width, background: `${color}55`, border: `1px solid ${color}` }}
                            title={p.nom}
                          >
                            {p.nom}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-stretch">
                  <div style={{ width: LARGEUR_LABEL }} className="shrink-0 px-3.5 py-2.5 flex items-center">
                    <span className="text-[13px] font-semibold" style={{ color: "var(--ink-secondary)" }}>
                      + Nouveau plan
                    </span>
                  </div>
                  <div className="relative flex" style={{ height: 44, width: SEMAINES_AFFICHEES * LARGEUR_SEMAINE }}>
                    {semaines.map((s, i) => {
                      return (
                        <div
                          key={i}
                          className="shrink-0 cursor-pointer"
                          style={{
                            width: LARGEUR_SEMAINE,
                            height: "100%",
                            borderLeft: i > 0 ? "1px dashed var(--border)" : undefined,
                            background: vacancesParSemaine[i] ? "rgba(242,179,61,0.09)" : undefined,
                          }}
                          onClick={() => setModalOpen({ mode: "new", presetTheme: OBJECTIFS[0].nom, presetDate: s, groupeId: groupe.id })}
                        />
                      );
                    })}
                  </div>
                </div>
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
                    <div className="text-[13px] font-semibold shrink-0" style={{ width: 130, color: "var(--ink-body)" }}>
                      {fmtDateCourte(date)} · {creneau.debut}
                    </div>
                    <div className="flex-1 min-w-0 text-[13px] truncate" style={{ color: plan ? "var(--ink-secondary)" : "var(--ink-muted)" }}>
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
                    <span className="text-[12px] shrink-0" style={{ color: "#7FDCFF" }}>
                      Voir →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modalOpen && groupe && (
        <PlanModal
          open={modalOpen}
          onClose={() => setModalOpen(null)}
          groupesParPole={groupesParPole}
          creneauxParGroupe={creneauxParGroupe}
          plans={plans}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
