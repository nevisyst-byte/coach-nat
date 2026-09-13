"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
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

type DragModele = { modeleId: string; modeleNom: string; x: number; y: number };

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
  const [decalageSemaines, setDecalageSemaines] = useState(0);

  const lundiCourant = ajouterJours(mondayOf(new Date()), decalageSemaines * 7);
  const semaines = Array.from({ length: SEMAINES_AFFICHEES }, (_, i) => ajouterJours(lundiCourant, i * 7));
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

  async function creerDepuisModele(semaine: Date, modele: Modele) {
    if (!groupe) return;
    setCreation(true);
    try {
      const payload: Record<string, unknown> = {
        nom: modele.nom,
        theme: modele.theme,
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

  // Glisser un modèle depuis la liste jusqu'à une case du calendrier — en
  // souris/tactile natifs (mousedown/mousemove/mouseup), pas le drag&drop
  // HTML5 (draggable/dragstart) qui ne déclenche rien sur tablette : même
  // pattern que le glisser-déposer déjà utilisé sur le Planning hebdo.
  const dragRef = useRef<DragModele | null>(null);
  const [dragState, setDragState] = useState<DragModele | null>(null);

  function startDragModele(e: React.MouseEvent, m: Modele) {
    e.preventDefault();
    dragRef.current = { modeleId: m.id, modeleNom: m.nom, x: e.clientX, y: e.clientY };
    setDragState(dragRef.current);
  }

  useEffect(() => {
    function celluleSous(x: number, y: number) {
      // elementFromPoint ne renvoie que l'élément le plus haut dans la pile :
      // une barre de plan déjà posée (bouton positionné en absolute, frère
      // des cases) peut recouvrir la case visée et masquer son data-cellule-id.
      // elementsFromPoint renvoie toute la pile empilée à ce point, du haut
      // vers le bas — on cherche la case dans l'ensemble.
      for (const el of document.elementsFromPoint(x, y)) {
        const cellule = (el as HTMLElement).closest<HTMLElement>("[data-cellule-id]");
        if (cellule) return cellule.dataset.celluleId ?? null;
      }
      return null;
    }

    function onMove(e: MouseEvent) {
      const info = dragRef.current;
      if (!info) return;
      dragRef.current = { ...info, x: e.clientX, y: e.clientY };
      setDragState(dragRef.current);
      setSurvolCellule(celluleSous(e.clientX, e.clientY));
    }

    function onUp(e: MouseEvent) {
      const info = dragRef.current;
      dragRef.current = null;
      setDragState(null);
      setSurvolCellule(null);
      if (!info) return;
      const celluleId = celluleSous(e.clientX, e.clientY);
      if (!celluleId) return;
      const modele = modeles.find((m) => m.id === info.modeleId);
      if (modele) creerDepuisModele(semaines[Number(celluleId)], modele);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeles, groupe?.id, decalageSemaines]);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
        Vue calendaire d&apos;un groupe : chaque ligne est un plan d&apos;entraînement déjà enregistré (nom libre, objectif et
        durée choisis à sa création), positionné sur ses vraies dates — clique sa barre pour l&apos;éditer. Utilise la
        dernière ligne pour en enregistrer un nouveau : clique une case pour le créer toi-même, ou glisse un modèle
        depuis la liste pour l&apos;appliquer directement.
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
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 220px" }}>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-x-auto">
              <div style={{ minWidth: LARGEUR_LABEL + SEMAINES_AFFICHEES * LARGEUR_SEMAINE }}>
                <div className="flex" style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="shrink-0 px-3.5 py-2.5 text-[12px] tracking-[0.1em] uppercase" style={{ width: LARGEUR_LABEL, color: "var(--ink-tertiary)" }}>
                    Plan
                  </div>
                  {semaines.map((s, i) => (
                    <div key={i} className="shrink-0 text-center py-2.5 text-[12px]" style={{ width: LARGEUR_SEMAINE, color: "var(--ink-tertiary)" }}>
                      {s.getDate()} {MOIS[s.getMonth()]}
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
                        {semaines.map((_, i) => (
                          <div key={i} className="shrink-0" style={{ width: LARGEUR_SEMAINE, height: "100%", borderLeft: i > 0 ? "1px solid var(--border)" : undefined }} />
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
                      const celluleId = String(i);
                      return (
                        <div
                          key={i}
                          data-cellule-id={celluleId}
                          className="shrink-0 cursor-pointer"
                          style={{
                            width: LARGEUR_SEMAINE,
                            height: "100%",
                            borderLeft: i > 0 ? "1px dashed var(--border)" : undefined,
                            background: survolCellule === celluleId ? "rgba(30,123,255,0.14)" : undefined,
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

          <div className="rounded-2xl p-3.5" style={{ border: "1px solid var(--border)" }}>
            <div className="text-[12px] tracking-[0.12em] uppercase mb-2.5" style={{ color: "var(--ink-tertiary)" }}>
              Modèles enregistrés
            </div>
            <div className="flex flex-col gap-1.5">
              {modeles.length === 0 && (
                <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Aucun modèle pour l&apos;instant — enregistre-en un depuis un plan.
                </div>
              )}
              {modeles.map((m) => (
                <div
                  key={m.id}
                  onMouseDown={(e) => startDragModele(e, m)}
                  className="rounded-lg px-2.5 py-2 text-[13px] font-semibold cursor-grab truncate select-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink-body)" }}
                  title={`${m.nom} — glisser sur une case`}
                >
                  {m.nom}
                </div>
              ))}
            </div>
            {creation && (
              <div className="mt-2.5 text-[12px]" style={{ color: "#7FDCFF" }}>
                Application du modèle…
              </div>
            )}
          </div>
        </div>
      )}

      {dragState && (
        <div
          className="fixed z-[200] rounded-lg px-3 py-2 text-[12px] font-bold pointer-events-none"
          style={{ left: dragState.x + 14, top: dragState.y + 14, background: "#1E7BFF", color: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
        >
          {dragState.modeleNom}
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
