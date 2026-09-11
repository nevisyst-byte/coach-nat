"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionsEditor } from "./SectionsEditor";
import { nouvelleSection, buildManualBlocs, volumeTotalManuel, fmtDistance, type SectionManuelle } from "@/lib/seance-manual";
import { couleurObjectif } from "@/lib/objectifs";

export function EditerSeanceInstance({ instanceId, heureDebutInitial, sectionsInitiales }: { instanceId: string; heureDebutInitial: string; sectionsInitiales: SectionManuelle[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [heureDebut, setHeureDebut] = useState(heureDebutInitial);
  const [sections, setSections] = useState<SectionManuelle[]>(sectionsInitiales.length > 0 ? sectionsInitiales : [nouvelleSection("Échauffement")]);
  const [saving, setSaving] = useState(false);

  async function enregistrer() {
    setSaving(true);
    try {
      await fetch(`/api/seance-instances/${instanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heureDebut, sections }),
      });
      router.refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded-[9px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer"
        style={{ border: "1px solid var(--border-strong)", color: "#7FDCFF" }}
      >
        ✎ Modifier cette séance
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 760, maxHeight: "88vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[19px] tracking-[0.05em]">Modifier cette séance</h2>
              <button onClick={() => setOpen(false)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto flex flex-col gap-4">
              <div className="text-[12px]" style={{ color: "var(--ink-secondary)" }}>
                Cette modification ne s&apos;applique qu&apos;à cette date précise — le plan d&apos;entraînement du groupe et ses
                autres créneaux ne sont pas touchés.
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Heure de début
                </div>
                <input
                  type="time"
                  value={heureDebut}
                  onChange={(e) => setHeureDebut(e.target.value)}
                  className="rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)", width: 140 }}
                />
              </div>
              <SectionsEditor sections={sections} onChange={setSections} />
              <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                Total : <strong style={{ color: "var(--ink)" }}>{fmtDistance(volumeTotalManuel(sections))}</strong>
              </div>

              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Aperçu — tel qu&apos;affiché dans « Séance prévue »
                </div>
                <div className="flex flex-col gap-2.5">
                  {buildManualBlocs(heureDebut, sections).map((b) => (
                    <div
                      key={b.phase}
                      className="flex gap-3.5 rounded-xl px-3.5 py-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderLeft: `3px solid ${b.objectif ? couleurObjectif(b.objectif) : "var(--border)"}` }}
                    >
                      <div style={{ minWidth: 64 }}>
                        <div className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "#61789B" }}>
                          {b.phase}
                        </div>
                        <div className="font-display text-lg">{b.distance}</div>
                        {b.objectif && (
                          <div className="text-[10px] font-semibold mt-0.5" style={{ color: couleurObjectif(b.objectif) }}>
                            {b.objectif}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold whitespace-pre-line">{b.contenu}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                          {b.consigne}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={enregistrer}
                disabled={saving}
                className="w-full rounded-[10px] py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Enregistrement…" : "Enregistrer pour cette date"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
