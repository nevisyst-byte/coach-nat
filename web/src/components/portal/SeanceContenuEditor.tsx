"use client";

import { useRef, useState } from "react";
import { Chip } from "@/components/ui/Card";
import { Camembert, type CamembertItem } from "@/components/ui/Camembert";
import { SectionsEditor } from "./SectionsEditor";
import { nouvelleSection, volumeTotalManuel, volumeParNage, fmtDistance, type SectionManuelle } from "@/lib/seance-manual";
import type { Combo, NageValeur } from "@/lib/seance-generator";

export const PALETTE = ["#1E7BFF", "#24C8FF", "#2ECC8F", "#F2B33D", "#E8442B", "#8C6BFF", "#5B7BA6"];

export const AXES = [
  { key: "variant" as const, titre: "Variant", aide: "Support technique", options: ["Nage complète", "Bras", "Jambes", "Éducatif"] },
  { key: "intensite" as const, titre: "Intensité", aide: "Allure de travail", options: ["Allure neutre", "Négatif split", "Progressif", "Seuil", "Allure 400", "Allure 200", "Vitesse"] },
  { key: "nage" as const, titre: "Nages", aide: "Support de nage", options: ["4 nages", "Spécialité", "Papillon", "Dos", "Brasse", "Crawl"] },
];

export function comboVide(): Combo {
  return { variant: [AXES[0].options[0]], intensite: [AXES[1].options[0]], nage: [{ valeur: AXES[2].options[0], pourcentage: 100 }], pourcentage: 100 };
}

// Variant et intensité : une répartition peut cocher plusieurs valeurs par
// axe (ex. Crawl + Dos) — son % est alors partagé à parts égales entre
// elles pour ce camembert, plutôt que compté en double.
export function camembertsAxes(field: "intensite" | "variant", combos: Combo[]): CamembertItem[] {
  const sums = new Map<string, number>();
  for (const c of combos) {
    const valeurs = c[field];
    if (valeurs.length === 0) continue;
    const part = c.pourcentage / valeurs.length;
    for (const v of valeurs) sums.set(v, (sums.get(v) ?? 0) + part);
  }
  return Array.from(sums.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nom, m], i) => ({ nom, m, color: PALETTE[i % PALETTE.length] }));
}

// Nage : chaque valeur cochée porte son propre % (saisi à côté de son
// bouton, cf. rendu ci-dessous) — pas de partage à parts égales.
export function camembertsNage(combos: Combo[]): CamembertItem[] {
  const sums = new Map<string, number>();
  for (const c of combos) {
    for (const n of c.nage) {
      if (!n.valeur) continue;
      sums.set(n.valeur, (sums.get(n.valeur) ?? 0) + (c.pourcentage * (n.pourcentage || 0)) / 100);
    }
  }
  return Array.from(sums.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nom, m], i) => ({ nom, m, color: PALETTE[i % PALETTE.length] }));
}

function sommeNage(nage: NageValeur[]) {
  return nage.reduce((s, n) => s + (n.pourcentage || 0), 0);
}

// Barre à 100% divisée en un segment par nage cochée — on glisse la
// poignée entre deux segments pour rééquilibrer leurs deux %, le reste ne
// bouge pas. La somme reste donc toujours exactement 100 par construction,
// sans validation à afficher : plus direct que taper un nombre par nage.
function BarreNagePourcentage({ nage, onChange }: { nage: NageValeur[]; onChange: (nage: NageValeur[]) => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ index: number; startX: number; startA: number; startB: number; base: NageValeur[] } | null>(null);

  function onHandleDown(e: React.MouseEvent, index: number) {
    e.preventDefault();
    dragRef.current = { index, startX: e.clientX, startA: nage[index].pourcentage, startB: nage[index + 1].pourcentage, base: nage };

    function onMove(ev: MouseEvent) {
      const info = dragRef.current;
      const largeur = barRef.current?.getBoundingClientRect().width;
      if (!info || !largeur) return;
      const total = info.startA + info.startB;
      const deltaPct = ((ev.clientX - info.startX) / largeur) * 100;
      const a = Math.max(1, Math.min(total - 1, Math.round(info.startA + deltaPct)));
      const b = total - a;
      onChange(info.base.map((n, i) => (i === info.index ? { ...n, pourcentage: a } : i === info.index + 1 ? { ...n, pourcentage: b } : n)));
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div ref={barRef} className="flex w-full rounded-lg overflow-hidden select-none" style={{ height: 32 }}>
      {nage.map((n, i) => (
        <div
          key={n.valeur}
          className="relative flex items-center justify-center"
          style={{ width: `${n.pourcentage}%`, minWidth: 0, background: PALETTE[i % PALETTE.length], borderRight: i < nage.length - 1 ? "1px solid rgba(0,0,0,0.35)" : undefined }}
        >
          <span className="truncate px-1 text-[11px] font-semibold text-white" style={{ maxWidth: "100%", overflow: "hidden" }}>
            {n.valeur} · {n.pourcentage}%
          </span>
          {i < nage.length - 1 && (
            <div
              onMouseDown={(e) => onHandleDown(e, i)}
              className="absolute top-0 h-full z-10"
              style={{ right: -6, width: 12, cursor: "col-resize" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export type Modele = {
  id: string;
  nom: string;
  theme: string;
  heureDebut: string | null;
  combos: Combo[] | null;
  volumeNage: number | null;
  sections: SectionManuelle[] | null;
};

export type SeanceContenu = {
  mode: "auto" | "manuel";
  heureDebut: string;
  combos: Combo[];
  volume: number;
  sections: SectionManuelle[];
};

export function contenuVide(): SeanceContenu {
  return { mode: "auto", heureDebut: "18:00", combos: [comboVide()], volume: 3000, sections: [nouvelleSection("Échauffement")] };
}

// Charger un modèle ne touche qu'au contenu (mode, heure, combos/sections,
// volume) — le reste (nom, dates, groupes/créneau...) est propre à
// l'endroit qui héberge cet éditeur et n'est jamais modifié ici.
export function appliquerModele(v: SeanceContenu, m: Modele): SeanceContenu {
  const aSections = !!m.sections && m.sections.length > 0;
  return {
    ...v,
    mode: aSections ? "manuel" : "auto",
    heureDebut: m.heureDebut ?? v.heureDebut,
    combos: m.combos && m.combos.length > 0 ? m.combos : [comboVide()],
    volume: m.volumeNage ?? v.volume,
    sections: aSections ? m.sections! : v.sections,
  };
}

export function combosValidesPour(v: SeanceContenu): boolean {
  if (v.mode !== "auto") return true;
  const repartitionsOk = v.combos.length === 1 || v.combos.reduce((s, c) => s + (c.pourcentage || 0), 0) === 100;
  const nagesOk = v.combos.every((c) => c.nage.length <= 1 || sommeNage(c.nage) === 100);
  return repartitionsOk && nagesOk;
}

// Éditeur de contenu de séance (mode auto à combos multi-nage/%, ou saisie
// manuelle par sections/séries) + ses camemberts de répartition — partagé
// entre un plan d'entraînement (Entraînement) et un créneau de stage, pour
// que les deux offrent exactement la même richesse de saisie.
export function SeanceContenuEditor({
  value,
  onChange,
  modeles = [],
  onEnregistrerModele,
}: {
  value: SeanceContenu;
  onChange: (updater: (v: SeanceContenu) => SeanceContenu) => void;
  modeles?: Modele[];
  onEnregistrerModele?: (nom: string) => Promise<void>;
}) {
  const [modeleNomOuvert, setModeleNomOuvert] = useState(false);
  const [modeleNom, setModeleNom] = useState("");
  const [savingModele, setSavingModele] = useState(false);

  function ajouterCombo() {
    onChange((v) => ({ ...v, combos: [...v.combos, { ...comboVide(), pourcentage: 0 }] }));
  }
  function supprimerCombo(index: number) {
    onChange((v) => ({ ...v, combos: v.combos.filter((_, i) => i !== index) }));
  }
  // Coche/décoche une valeur pour l'axe variant/intensité de cette
  // répartition — au moins une valeur doit rester cochée, donc la dernière
  // ne se décoche pas (il faudrait alors en cocher une autre d'abord).
  function toggleComboValeur(index: number, field: "variant" | "intensite", valeur: string) {
    onChange((v) => ({
      ...v,
      combos: v.combos.map((c, i) => {
        if (i !== index) return c;
        const present = c[field].includes(valeur);
        if (present && c[field].length === 1) return c;
        return { ...c, [field]: present ? c[field].filter((x) => x !== valeur) : [...c[field], valeur] };
      }),
    }));
  }
  function updateComboPourcentage(index: number, val: number) {
    onChange((v) => ({ ...v, combos: v.combos.map((c, i) => (i === index ? { ...c, pourcentage: val } : c)) }));
  }

  // Nage : coche/décoche redistribue tout de suite un % égal entre les
  // valeurs cochées (immédiatement utilisable), que l'utilisateur peut
  // ensuite affiner en glissant les poignées de la barre ci-dessous —
  // pas besoin d'ouvrir une répartition séparée par nage.
  function repartirEgal(valeurs: string[]): NageValeur[] {
    const part = Math.round(100 / valeurs.length);
    return valeurs.map((valeur, i) => ({ valeur, pourcentage: i === valeurs.length - 1 ? 100 - part * (valeurs.length - 1) : part }));
  }
  function toggleNageValeur(index: number, valeur: string) {
    onChange((v) => ({
      ...v,
      combos: v.combos.map((c, i) => {
        if (i !== index) return c;
        const present = c.nage.some((n) => n.valeur === valeur);
        if (present && c.nage.length === 1) return c;
        const valeurs = present ? c.nage.filter((n) => n.valeur !== valeur).map((n) => n.valeur) : [...c.nage.map((n) => n.valeur), valeur];
        return { ...c, nage: repartirEgal(valeurs) };
      }),
    }));
  }
  function setNagePourcentages(index: number, nextNage: NageValeur[]) {
    onChange((v) => ({ ...v, combos: v.combos.map((c, i) => (i === index ? { ...c, nage: nextNage } : c)) }));
  }

  async function confirmerModele() {
    if (!modeleNom.trim() || !onEnregistrerModele) return;
    setSavingModele(true);
    try {
      await onEnregistrerModele(modeleNom.trim());
      setModeleNom("");
      setModeleNomOuvert(false);
    } finally {
      setSavingModele(false);
    }
  }

  const sommeCombos = value.combos.reduce((s, c) => s + (c.pourcentage || 0), 0);
  const camembertsPlan: { titre: string; items: CamembertItem[] }[] =
    value.mode === "auto" && value.combos.length > 1
      ? [
          { titre: "Par nage", items: camembertsNage(value.combos) },
          { titre: "Par intensité", items: camembertsAxes("intensite", value.combos) },
          { titre: "Par variant", items: camembertsAxes("variant", value.combos) },
        ]
      : value.mode === "manuel"
        ? [{ titre: "Par nage", items: volumeParNage(value.sections).map((v, i) => ({ nom: v.nage, m: v.m, color: PALETTE[i % PALETTE.length] })) }]
        : [];

  return (
    <>
      <div className="flex flex-col gap-3.5 rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            <Chip active={value.mode === "auto"} onClick={() => onChange((v) => ({ ...v, mode: "auto" }))}>
              Variant · Intensité · Nage
            </Chip>
            <Chip active={value.mode === "manuel"} onClick={() => onChange((v) => ({ ...v, mode: "manuel" }))}>
              Saisie manuelle
            </Chip>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px]" style={{ color: "#61789B" }}>
              Heure de début
            </span>
            <input
              type="time"
              value={value.heureDebut}
              onChange={(e) => onChange((v) => ({ ...v, heureDebut: e.target.value }))}
              className="rounded-[9px] px-2.5 py-1.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
            />
          </div>
        </div>

        {(modeles.length > 0 || onEnregistrerModele) && (
          <div className="flex items-center gap-2 flex-wrap" style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            {modeles.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const m = modeles.find((x) => x.id === e.target.value);
                  if (m) onChange((v) => appliquerModele(v, m));
                  e.target.value = "";
                }}
                className="rounded-[9px] px-2.5 py-1.5 text-[12px] outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              >
                <option value="" style={{ background: "#101A2B" }}>
                  Charger un modèle…
                </option>
                {modeles.map((m) => (
                  <option key={m.id} value={m.id} style={{ background: "#101A2B" }}>
                    {m.nom}
                  </option>
                ))}
              </select>
            )}
            {onEnregistrerModele &&
              (modeleNomOuvert ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={modeleNom}
                    onChange={(e) => setModeleNom(e.target.value)}
                    placeholder="Nom du modèle"
                    autoFocus
                    className="rounded-[9px] px-2.5 py-1.5 text-[12px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                  <button
                    onClick={confirmerModele}
                    disabled={savingModele || !modeleNom.trim()}
                    className="rounded-[9px] px-2.5 py-1.5 text-[12px] font-semibold cursor-pointer"
                    style={{ border: "1px solid var(--border-strong)", color: "#7FDCFF", opacity: savingModele || !modeleNom.trim() ? 0.6 : 1 }}
                  >
                    Confirmer
                  </button>
                  <button onClick={() => setModeleNomOuvert(false)} className="text-[12px] cursor-pointer" style={{ color: "var(--ink-muted)" }}>
                    Annuler
                  </button>
                </div>
              ) : (
                <button onClick={() => setModeleNomOuvert(true)} className="text-[12px] font-semibold cursor-pointer underline ml-auto" style={{ color: "var(--ink-secondary)" }}>
                  💾 Enregistrer comme modèle
                </button>
              ))}
          </div>
        )}

        {value.mode === "auto" ? (
          <>
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                Volume cible (m)
              </div>
              <input
                type="number"
                min={100}
                step={50}
                value={value.volume}
                onChange={(e) => onChange((v) => ({ ...v, volume: parseInt(e.target.value, 10) || 0 }))}
                className="rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)", width: 160 }}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              {value.combos.map((combo, index) => (
                <div key={index} className="flex flex-col gap-2 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold" style={{ color: "var(--ink-secondary)" }}>
                      Répartition {index + 1}
                    </span>
                    {value.combos.length > 1 && (
                      <button onClick={() => supprimerCombo(index)} className="text-xs cursor-pointer" style={{ color: "var(--ink-muted)" }} title="Supprimer cette répartition">
                        ✕
                      </button>
                    )}
                  </div>
                  {AXES.map((ax) =>
                    ax.key === "nage" ? (
                      <div key={ax.key}>
                        <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "#61789B" }}>
                          {ax.titre}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {ax.options.map((o) => (
                            <Chip key={o} active={combo.nage.some((n) => n.valeur === o)} onClick={() => toggleNageValeur(index, o)}>
                              {o}
                            </Chip>
                          ))}
                        </div>
                        {combo.nage.length > 1 && <BarreNagePourcentage nage={combo.nage} onChange={(next) => setNagePourcentages(index, next)} />}
                      </div>
                    ) : (
                      <div key={ax.key}>
                        <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "#61789B" }}>
                          {ax.titre}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ax.options.map((o) => (
                            <Chip key={o} active={combo[ax.key].includes(o)} onClick={() => toggleComboValeur(index, ax.key, o)}>
                              {o}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                  {value.combos.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px]" style={{ color: "#61789B" }}>
                        % du volume principal
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={combo.pourcentage}
                        onChange={(e) => updateComboPourcentage(index, parseInt(e.target.value, 10) || 0)}
                        className="rounded-[9px] px-2.5 py-1.5 text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)", width: 80 }}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={ajouterCombo}
                className="rounded-[10px] py-1.5 text-[12px] font-semibold cursor-pointer"
                style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-secondary)" }}
              >
                + Ajouter une répartition
              </button>
              {value.combos.length > 1 && (
                <div className="text-[12px]" style={{ color: sommeCombos === 100 ? "#61789B" : "#FF9179" }}>
                  Total : {sommeCombos}% {sommeCombos !== 100 && "— doit être égal à 100%"}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <SectionsEditor sections={value.sections} onChange={(sections) => onChange((v) => ({ ...v, sections }))} />
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Total : <strong style={{ color: "var(--ink)" }}>{fmtDistance(volumeTotalManuel(value.sections))}</strong>
            </div>
          </>
        )}
      </div>

      {camembertsPlan.some((c) => c.items.length > 0) && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          {camembertsPlan.map(
            (ch) =>
              ch.items.length > 0 &&
              (value.mode === "auto" ? (
                <Camembert key={ch.titre} titre={ch.titre} items={ch.items} totalLabel="du volume" formatTotal={() => "100%"} formatValeur={() => ""} />
              ) : (
                <Camembert key={ch.titre} titre={ch.titre} items={ch.items} />
              ))
          )}
        </div>
      )}
    </>
  );
}
