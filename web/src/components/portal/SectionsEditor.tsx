"use client";

import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
import { nouvelleSection, nouvelleSet, distanceSection, fmtDistance, type SectionManuelle } from "@/lib/seance-manual";

const NAGES = ["Papillon", "Dos", "Brasse", "Crawl"];
const NAGE_ABBR: Record<string, string> = { Papillon: "Pap", Dos: "Dos", Brasse: "Bra", Crawl: "Cr" };

// Éditeur de sections/séries (reps × distance @ allure, repos) partagé par
// le détail d'un plan d'entraînement et l'édition ponctuelle d'une séance —
// mêmes distances 100% libres (jamais de liste déroulante), même format,
// pour que le coach retrouve la même interface partout.
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
  function toggleNageSet(sectionId: string, setId: string, nage: string) {
    onChange(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              sets: s.sets.map((x) => (x.id === setId ? { ...x, nages: x.nages.includes(nage) ? x.nages.filter((n) => n !== nage) : [...x.nages, nage] } : x)),
            }
          : s
      )
    );
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

          <div className="grid gap-1.5 text-[11px] tracking-[0.08em] uppercase mb-1" style={{ gridTemplateColumns: "56px 64px 1fr 150px 64px 64px 20px", color: "var(--ink-tertiary)" }}>
            <span>Rép.</span>
            <span>Dist.</span>
            <span>Contenu</span>
            <span>Nages</span>
            <span>Départ</span>
            <span>Repos</span>
            <span />
          </div>
          <div className="flex flex-col gap-1.5">
            {section.sets.map((s) => (
              <div key={s.id} className="grid gap-1.5 items-center" style={{ gridTemplateColumns: "56px 64px 1fr 150px 64px 64px 20px" }}>
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
                  placeholder="ex. Éducatif, jambes…"
                  className="rounded-md px-1.5 py-1.5 text-[13px] outline-none min-w-0"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
                <div className="flex gap-1 flex-wrap" title="Une ou plusieurs nages pour cet exercice (ex. crawl + dos)">
                  {NAGES.map((n) => {
                    const on = s.nages.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggleNageSet(section.id, s.id, n)}
                        className="rounded-md px-1.5 py-1 text-[10px] font-bold cursor-pointer"
                        style={{ border: `1px solid ${on ? "#1E7BFF" : "var(--border-strong)"}`, background: on ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)", color: on ? "#7FDCFF" : "var(--ink-secondary)" }}
                      >
                        {NAGE_ABBR[n]}
                      </button>
                    );
                  })}
                </div>
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
