"use client";

import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
import { nouvelleSection, nouvelleSet, distanceSection, fmtDistance, valeursAxe, type SectionManuelle } from "@/lib/seance-manual";
import { BarreRepartition, repartirEgal } from "@/components/ui/BarreRepartition";
import { AXES, AXE_ABBR } from "@/lib/axes";
import type { ValeurPourcentage } from "@/lib/seance-generator";

// `SetLigne.nages` reste au pluriel (déjà stocké ainsi dans les séances et
// plans existants) alors que AXES utilise la clé singulière "nage" (comme
// pour un Combo) — cette correspondance évite de renommer le champ stocké.
function champDe(axe: "variant" | "intensite" | "nage"): "variant" | "intensite" | "nages" {
  return axe === "nage" ? "nages" : axe;
}

// Éditeur de sections/séries (reps × distance @ allure, repos) partagé par
// le détail d'un plan d'entraînement et l'édition ponctuelle d'une séance —
// mêmes distances 100% libres (jamais de liste déroulante), même format,
// pour que le coach retrouve la même interface partout. Les 3 axes
// (variant/intensité/nage) se cochent par set, comme un combo en mode
// auto — plusieurs valeurs cochées se répartissent en % via la même barre
// glissable.
export function SectionsEditor({ sections, onChange }: { sections: SectionManuelle[]; onChange: (sections: SectionManuelle[]) => void }) {
  function ajouterSection() {
    onChange([...sections, nouvelleSection()]);
  }
  function supprimerSection(id: string) {
    onChange(sections.filter((s) => s.id !== id));
  }
  function renommerSection(id: string, nom: string) {
    onChange(sections.map((s) => (s.id === id ? { ...s, nom } : s)));
  }
  function assignerObjectifSection(id: string, objectif: string) {
    onChange(sections.map((s) => (s.id === id ? { ...s, objectif } : s)));
  }
  function ajouterSet(sectionId: string) {
    onChange(sections.map((s) => (s.id === sectionId ? { ...s, sets: [...s.sets, nouvelleSet()] } : s)));
  }
  function supprimerSet(sectionId: string, setId: string) {
    onChange(sections.map((s) => (s.id === sectionId ? { ...s, sets: s.sets.filter((x) => x.id !== setId) } : s)));
  }
  function updateSet(sectionId: string, setId: string, field: "reps" | "distance" | "label" | "allure" | "repos", value: string) {
    onChange(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, sets: s.sets.map((x) => (x.id === setId ? { ...x, [field]: field === "reps" || field === "distance" ? parseInt(value, 10) || 0 : value } : x)) }
          : s
      )
    );
  }
  function toggleAxeValeurSet(sectionId: string, setId: string, axe: "variant" | "intensite" | "nage", valeur: string) {
    const champ = champDe(axe);
    onChange(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              sets: s.sets.map((x) => {
                if (x.id !== setId) return x;
                const actuelles = valeursAxe(x, champ);
                const dejaCoche = actuelles.some((n) => n.valeur === valeur);
                const valeurs = dejaCoche ? actuelles.filter((n) => n.valeur !== valeur).map((n) => n.valeur) : [...actuelles.map((n) => n.valeur), valeur];
                return { ...x, [champ]: repartirEgal(valeurs) };
              }),
            }
          : s
      )
    );
  }
  function updateAxePourcentagesSet(sectionId: string, setId: string, axe: "variant" | "intensite" | "nage", valeurs: ValeurPourcentage[]) {
    const champ = champDe(axe);
    onChange(sections.map((s) => (s.id === sectionId ? { ...s, sets: s.sets.map((x) => (x.id === setId ? { ...x, [champ]: valeurs } : x)) } : s)));
  }

  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => (
        <div
          key={section.id}
          className="rounded-xl p-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `3px solid ${section.objectif ? couleurObjectif(section.objectif) : "var(--border-strong)"}` }}
        >
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <input
              value={section.nom}
              onChange={(e) => renommerSection(section.id, e.target.value)}
              placeholder="Nom de la section (ex. Jambes)"
              className="flex-1 font-display text-sm tracking-[0.04em] uppercase bg-transparent outline-none"
              style={{ color: "var(--ink)", minWidth: 120 }}
            />
            <select
              value={section.objectif}
              onChange={(e) => assignerObjectifSection(section.id, e.target.value)}
              className="rounded-md px-2 py-1 text-[11px] font-semibold outline-none shrink-0"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: section.objectif ? couleurObjectif(section.objectif) : "var(--ink-secondary)" }}
            >
              <option value="" style={{ background: "#101A2B", color: "var(--ink)" }}>
                — objectif —
              </option>
              {OBJECTIFS.map((o) => (
                <option key={o.nom} value={o.nom} style={{ background: "#101A2B", color: o.color }}>
                  {o.nom}
                </option>
              ))}
            </select>
            <span className="text-[13px] shrink-0" style={{ color: "var(--ink-secondary)" }}>
              {fmtDistance(distanceSection(section))}
            </span>
            <button onClick={() => supprimerSection(section.id)} className="text-[13px] cursor-pointer shrink-0" style={{ color: "var(--ink-muted)" }} title="Supprimer la section">
              ✕
            </button>
          </div>

          <div className="grid gap-1.5 text-[11px] tracking-[0.08em] uppercase mb-1" style={{ gridTemplateColumns: "56px 64px 1fr 64px 64px 20px", color: "var(--ink-tertiary)" }}>
            <span>Rép.</span>
            <span>Dist.</span>
            <span>Contenu</span>
            <span>Départ</span>
            <span>Repos</span>
            <span />
          </div>
          <div className="flex flex-col gap-2">
            {section.sets.map((s) => (
              <div key={s.id} className="flex flex-col gap-1.5 rounded-lg p-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="grid gap-1.5 items-center" style={{ gridTemplateColumns: "56px 64px 1fr 64px 64px 20px" }}>
                  <input
                    type="number"
                    value={s.reps}
                    onChange={(e) => updateSet(section.id, s.id, "reps", e.target.value)}
                    className="rounded-md px-1.5 py-1.5 text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                  <input
                    type="number"
                    value={s.distance}
                    onChange={(e) => updateSet(section.id, s.id, "distance", e.target.value)}
                    className="rounded-md px-1.5 py-1.5 text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                  <input
                    value={s.label}
                    onChange={(e) => updateSet(section.id, s.id, "label", e.target.value)}
                    placeholder="ex. libre, remarque…"
                    className="rounded-md px-1.5 py-1.5 text-[13px] outline-none min-w-0"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                  <input
                    value={s.allure}
                    onChange={(e) => updateSet(section.id, s.id, "allure", e.target.value)}
                    placeholder="3:40"
                    title="Départ / allure par répétition (mm:ss)"
                    className="rounded-md px-1.5 py-1.5 text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                  <input
                    value={s.repos}
                    onChange={(e) => updateSet(section.id, s.id, "repos", e.target.value)}
                    placeholder="0:40"
                    title="Repos après la série (mm:ss)"
                    className="rounded-md px-1.5 py-1.5 text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                  <button onClick={() => supprimerSet(section.id, s.id)} className="text-[13px] cursor-pointer" style={{ color: "var(--ink-muted)" }} title="Supprimer cette série">
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {AXES.map((ax) => {
                    const valeurs = valeursAxe(s, champDe(ax.key));
                    return (
                      <div key={ax.key} className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] tracking-[0.06em] uppercase shrink-0" style={{ color: "var(--ink-tertiary)", minWidth: 52 }}>
                            {ax.titre}
                          </span>
                          {ax.options.map((o) => {
                            const on = valeurs.some((v) => v.valeur === o);
                            return (
                              <button
                                key={o}
                                type="button"
                                onClick={() => toggleAxeValeurSet(section.id, s.id, ax.key, o)}
                                className="rounded-md px-1.5 py-1 text-[10px] font-bold cursor-pointer"
                                style={{ border: `1px solid ${on ? "#1E7BFF" : "var(--border-strong)"}`, background: on ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)", color: on ? "#7FDCFF" : "var(--ink-secondary)" }}
                              >
                                {AXE_ABBR[ax.key][o]}
                              </button>
                            );
                          })}
                        </div>
                        {valeurs.length > 1 && <BarreRepartition valeurs={valeurs} onChange={(next) => updateAxePourcentagesSet(section.id, s.id, ax.key, next)} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => ajouterSet(section.id)} className="mt-2 text-[11px] cursor-pointer underline" style={{ color: "var(--ink-muted)" }}>
            + série
          </button>
        </div>
      ))}
      <button onClick={ajouterSection} className="rounded-[10px] py-2 text-[12px] font-semibold cursor-pointer" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-secondary)" }}>
        + Nouvelle section
      </button>
    </div>
  );
}
