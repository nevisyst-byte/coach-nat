"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OBJECTIFS } from "@/lib/objectifs";
import { mondayOf, toDateInputValue } from "@/lib/week";
import { PlanModal, type Section, type CreneauLite, type Plan, type PlanModalOpen } from "./PlanModal";
import type { Modele } from "./SeanceContenuEditor";

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

export function PlanningEntrainementClient({
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
  const toutGroupes = groupesParPole.flatMap((s) => s.groupes);
  const [groupeId, setGroupeId] = useState<string>(toutGroupes[0]?.id ?? "");
  const [modalOpen, setModalOpen] = useState<PlanModalOpen | null>(null);
  const [survolCellule, setSurvolCellule] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);

  const lundiCourant = mondayOf(new Date());
  const semaines = Array.from({ length: SEMAINES_AFFICHEES }, (_, i) => ajouterJours(lundiCourant, i * 7));
  const fenetreFin = ajouterJours(lundiCourant, SEMAINES_AFFICHEES * 7);

  const groupe = toutGroupes.find((g) => g.id === groupeId) ?? null;
  const plansGroupe = groupe ? plans.filter((p) => p.groupes.some((g) => g.id === groupe.id)) : [];

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

  async function creerDepuisModele(objectifNom: string, semaine: Date, modele: Modele) {
    if (!groupe) return;
    setCreation(true);
    try {
      const payload: Record<string, unknown> = {
        nom: modele.nom,
        theme: objectifNom,
        dateDebut: toDateInputValue(semaine),
        dureeSemaines: 4,
        groupeIds: [groupe.id],
        heureDebut: modele.heureDebut ?? "18:00",
      };
      if (modele.sections && modele.sections.length > 0) payload.sections = modele.sections;
      else {
        payload.combos = modele.combos && modele.combos.length > 0 ? modele.combos : undefined;
        payload.volumeNage = modele.volumeNage ?? 3000;
      }
      await fetch("/api/plans-entrainement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      router.refresh();
    } finally {
      setCreation(false);
      setSurvolCellule(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
        Vue calendaire d&apos;un groupe : chaque barre est un plan d&apos;entraînement déjà enregistré, positionné sur ses vraies
        dates. Clique une barre pour l&apos;éditer, une case vide pour en planifier un nouveau, ou glisse un modèle depuis
        la liste sur une case pour l&apos;appliquer directement.
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] tracking-[0.12em] uppercase" style={{ color: "#61789B" }}>
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

      {!groupe ? (
        <div className="rounded-2xl py-10 text-center text-[14px] font-semibold" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-secondary)" }}>
          Aucun groupe disponible.
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 220px" }}>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-x-auto">
              <div style={{ minWidth: LARGEUR_LABEL + SEMAINES_AFFICHEES * LARGEUR_SEMAINE }}>
                <div className="flex" style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="shrink-0 px-3.5 py-2.5 text-[10px] tracking-[0.1em] uppercase" style={{ width: LARGEUR_LABEL, color: "#61789B" }}>
                    Objectif
                  </div>
                  {semaines.map((s, i) => (
                    <div key={i} className="shrink-0 text-center py-2.5 text-[10px]" style={{ width: LARGEUR_SEMAINE, color: "#61789B" }}>
                      {s.getDate()} {MOIS[s.getMonth()]}
                    </div>
                  ))}
                </div>

                {OBJECTIFS.map((objectif) => (
                  <div key={objectif.nom} className="flex items-stretch" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: LARGEUR_LABEL }} className="shrink-0 px-3.5 py-2.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: objectif.color }} />
                      <span className="text-sm font-semibold truncate">{objectif.nom}</span>
                    </div>
                    <div className="relative flex" style={{ height: 44, width: SEMAINES_AFFICHEES * LARGEUR_SEMAINE }}>
                      {semaines.map((s, i) => {
                        const celluleId = `${objectif.nom}|${i}`;
                        return (
                          <div
                            key={i}
                            className="shrink-0"
                            style={{ width: LARGEUR_SEMAINE, height: "100%", borderLeft: i > 0 ? "1px solid var(--border)" : undefined, background: survolCellule === celluleId ? "rgba(30,123,255,0.14)" : undefined }}
                            onClick={() => setModalOpen({ mode: "new", presetTheme: objectif.nom, presetDate: s, groupeId: groupe.id })}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setSurvolCellule(celluleId);
                            }}
                            onDragLeave={() => setSurvolCellule((c) => (c === celluleId ? null : c))}
                            onDrop={(e) => {
                              e.preventDefault();
                              const modeleId = e.dataTransfer.getData("text/modele-id");
                              const modele = modeles.find((m) => m.id === modeleId);
                              if (modele) creerDepuisModele(objectif.nom, s, modele);
                              else setSurvolCellule(null);
                            }}
                          />
                        );
                      })}
                      {plansGroupe
                        .filter((p) => p.theme === objectif.nom)
                        .map((p) => {
                          const style = barreStyle(p);
                          if (!style) return null;
                          return (
                            <button
                              key={p.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalOpen({ mode: "edit", plan: p });
                              }}
                              className="absolute rounded-md px-2 flex items-center text-[11px] font-semibold truncate cursor-pointer"
                              style={{ top: 8, height: 28, left: style.left + 2, width: style.width, background: `${objectif.color}55`, border: `1px solid ${objectif.color}` }}
                              title={p.nom}
                            >
                              {p.nom}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-3.5" style={{ border: "1px solid var(--border)" }}>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2.5" style={{ color: "#61789B" }}>
              Modèles enregistrés
            </div>
            <div className="flex flex-col gap-1.5">
              {modeles.length === 0 && (
                <div className="text-[12px]" style={{ color: "var(--ink-secondary)" }}>
                  Aucun modèle pour l&apos;instant — enregistre-en un depuis un plan.
                </div>
              )}
              {modeles.map((m) => (
                <div
                  key={m.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/modele-id", m.id)}
                  className="rounded-lg px-2.5 py-2 text-[12px] font-semibold cursor-grab truncate"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink-body)" }}
                  title={`${m.nom} — glisser sur une case`}
                >
                  {m.nom}
                </div>
              ))}
            </div>
            {creation && (
              <div className="mt-2.5 text-[11px]" style={{ color: "#7FDCFF" }}>
                Application du modèle…
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && groupe && (
        <PlanModal
          open={modalOpen}
          onClose={() => setModalOpen(null)}
          groupesParPole={groupesParPole}
          creneauxParGroupe={creneauxParGroupe}
          modeles={modeles}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
