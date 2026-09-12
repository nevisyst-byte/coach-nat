"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Card";
import { Camembert, type CamembertItem } from "@/components/ui/Camembert";
import { SectionsEditor } from "./SectionsEditor";
import { nouvelleSection, volumeTotalManuel, volumeParNage, fmtDistance, type SectionManuelle } from "@/lib/seance-manual";
import type { Combo } from "@/lib/seance-generator";

export const PALETTE = ["#1E7BFF", "#24C8FF", "#2ECC8F", "#F2B33D", "#E8442B", "#8C6BFF", "#5B7BA6"];

export const AXES = [
  { key: "variant" as const, titre: "Variant", aide: "Support technique", options: ["Nage complète", "Bras", "Jambes", "Éducatif"] },
  { key: "intensite" as const, titre: "Intensité", aide: "Allure de travail", options: ["Allure neutre", "Négatif split", "Progressif", "Seuil", "Allure 400", "Allure 200", "Vitesse"] },
  { key: "nage" as const, titre: "Nages", aide: "Support de nage", options: ["4 nages", "Spécialité", "Papillon", "Dos", "Brasse", "Crawl"] },
];

export function comboVide(): Combo {
  return { variant: AXES[0].options[0], intensite: AXES[1].options[0], nage: AXES[2].options[0], pourcentage: 100 };
}

export function camembertsAxes(field: "nage" | "intensite" | "variant", combos: Combo[]): CamembertItem[] {
  const sums = new Map<string, number>();
  for (const c of combos) sums.set(c[field], (sums.get(c[field]) ?? 0) + c.pourcentage);
  return Array.from(sums.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nom, m], i) => ({ nom, m, color: PALETTE[i % PALETTE.length] }));
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
  if (v.mode !== "auto" || v.combos.length === 1) return true;
  return v.combos.reduce((s, c) => s + (c.pourcentage || 0), 0) === 100;
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
  function updateCombo(index: number, field: "variant" | "intensite" | "nage", val: string) {
    onChange((v) => ({ ...v, combos: v.combos.map((c, i) => (i === index ? { ...c, [field]: val } : c)) }));
  }
  function updateComboPourcentage(index: number, val: number) {
    onChange((v) => ({ ...v, combos: v.combos.map((c, i) => (i === index ? { ...c, pourcentage: val } : c)) }));
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
          { titre: "Par nage", items: camembertsAxes("nage", value.combos) },
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
                  {AXES.map((ax) => (
                    <div key={ax.key}>
                      <div className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "#61789B" }}>
                        {ax.titre}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ax.options.map((o) => (
                          <Chip key={o} active={combo[ax.key] === o} onClick={() => updateCombo(index, ax.key, o)}>
                            {o}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ))}
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
