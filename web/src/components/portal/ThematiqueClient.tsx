"use client";

import { useMemo, useState } from "react";
import { Card, Chip } from "@/components/ui/Card";
import { THEMES, genererCyclePhases, type PhaseCycle } from "@/lib/thematique-generator";

const VARIANT_OPTIONS = ["Nage complète", "Bras", "Jambes", "Éducatif"];
const NAGE_OPTIONS = ["4 nages", "Spécialité", "Papillon", "Dos", "Brasse", "Crawl"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function ThematiqueClient({ groupes }: { groupes: string[] }) {
  const [phases, setPhases] = useState<(PhaseCycle & { id: string })[]>([{ id: uid(), theme: THEMES[0].nom, duree: 4 }]);
  const [variant, setVariant] = useState(VARIANT_OPTIONS[0]);
  const [nage, setNage] = useState(NAGE_OPTIONS[0]);
  const [objectif, setObjectif] = useState("Tenir l'allure 200 sur la fin de course");
  const [groupe, setGroupe] = useState(groupes[0] ?? "");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function ajouterPhase() {
    setPhases((prev) => [...prev, { id: uid(), theme: THEMES[0].nom, duree: 4 }]);
  }

  function supprimerPhase(id: string) {
    setPhases((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }

  function updatePhaseTheme(id: string, theme: string) {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, theme } : p)));
  }

  function updatePhaseDuree(id: string, duree: string) {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, duree: Math.max(1, parseInt(duree, 10) || 1) } : p)));
  }

  const dureeTotale = phases.reduce((sum, p) => sum + p.duree, 0);

  const { cycleSeances, chargeSemaines, volumeThemes, courbeCharge } = useMemo(
    () => genererCyclePhases(phases, variant, nage),
    [phases, variant, nage]
  );

  async function save() {
    setSaving(true);
    setSaved(null);
    try {
      const themeLabel = phases.map((p) => `${p.theme} (${p.duree} sem.)`).join(" → ");
      await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeLabel, variant, nage, objectif, groupeNom: groupe, dureeSemaines: dureeTotale, seances: cycleSeances }),
      });
      setSaved("Cycle enregistré.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card padding={22}>
        <h2 className="font-display text-xl tracking-[0.06em] mb-1">Nouvelle thématique d&apos;entraînement</h2>
        <p className="text-[13px] mb-4" style={{ color: "var(--ink-secondary)", maxWidth: 660 }}>
          Une thématique combine un variant, une intensité et une nage, puis génère automatiquement le cycle de séances qui mène le groupe à son objectif.
        </p>

        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[11px] tracking-[0.12em] uppercase" style={{ color: "#61789B" }}>
            Phases du cycle
          </div>
          <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
            Durée totale : <strong style={{ color: "var(--ink)" }}>{dureeTotale} semaines</strong>
          </span>
        </div>
        <div className="flex flex-col gap-2 mb-5">
          {phases.map((phase, i) => (
            <div key={phase.id} className="flex items-center gap-2 flex-wrap rounded-[10px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid var(--border)`, borderLeft: `3px solid ${THEMES[Math.max(0, THEMES.findIndex((t) => t.nom === phase.theme))].color}` }}>
              <span className="text-xs font-bold shrink-0" style={{ color: "#61789B", minWidth: 60 }}>
                Phase {i + 1}
              </span>
              <select
                value={phase.theme}
                onChange={(e) => updatePhaseTheme(phase.id, e.target.value)}
                className="rounded-[9px] px-3 py-2 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              >
                {THEMES.map((th) => (
                  <option key={th.nom} value={th.nom} style={{ background: "#101A2B", color: th.color }}>
                    {th.nom}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={phase.duree}
                  onChange={(e) => updatePhaseDuree(phase.id, e.target.value)}
                  className="rounded-[9px] px-3 py-2 text-sm outline-none"
                  style={{ width: 64, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
                <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                  semaine{phase.duree > 1 ? "s" : ""}
                </span>
              </div>
              {phases.length > 1 && (
                <button onClick={() => supprimerPhase(phase.id)} className="ml-auto text-xs cursor-pointer" style={{ color: "var(--ink-muted)" }} title="Supprimer cette phase">
                  ✕
                </button>
              )}
            </div>
          ))}
          <button onClick={ajouterPhase} className="rounded-[10px] py-2 text-[12px] font-semibold cursor-pointer" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-secondary)" }}>
            + Nouvelle phase (ex. 4 semaines Volume aérobie puis 2 semaines Vitesse)
          </button>
        </div>

        <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
              Type de variant
            </div>
            <div className="flex gap-2 flex-wrap">
              {VARIANT_OPTIONS.map((o) => (
                <Chip key={o} active={variant === o} onClick={() => setVariant(o)}>
                  {o}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
              Type de nage
            </div>
            <div className="flex gap-2 flex-wrap">
              {NAGE_OPTIONS.map((o) => (
                <Chip key={o} active={nage === o} onClick={() => setNage(o)}>
                  {o}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3.5 items-end" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
              Objectif du groupe
            </div>
            <input value={objectif} onChange={(e) => setObjectif(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
          </div>
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
              Groupe
            </div>
            <select value={groupe} onChange={(e) => setGroupe(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
              {groupes.map((g) => (
                <option key={g} value={g} style={{ background: "#101A2B" }}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <button onClick={save} disabled={saving} className="rounded-[10px] px-4 text-[13px] font-bold cursor-pointer" style={{ height: 42, background: "linear-gradient(135deg,#E8442B,#B92E19)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Génération…" : "Générer le cycle"}
          </button>
        </div>
        {saved && (
          <div className="mt-3 text-[13px]" style={{ color: "#2ECC8F" }}>
            {saved}
          </div>
        )}
      </Card>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))" }}>
        <Card>
          <div className="flex items-baseline justify-between mb-1 gap-2 flex-wrap">
            <h2 className="font-display text-[19px] tracking-[0.06em]">Répartition des filières par semaine</h2>
            <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
              % du volume · hauteur = volume total
            </span>
          </div>
          <div className="flex items-end gap-4 pt-4" style={{ height: 230 }}>
            {chargeSemaines.map((w) => (
              <div key={w.semaine} className="flex-1 flex flex-col justify-end items-center gap-2" style={{ height: "100%" }}>
                <div className="text-[11px]" style={{ color: "var(--ink-secondary)" }}>
                  {w.volume}
                </div>
                <div className="w-full flex flex-col rounded-lg overflow-hidden" style={{ maxWidth: 70, height: `${w.hauteurPct}%`, border: "1px solid var(--border-strong)" }}>
                  {w.segments.map((sg) => (
                    <div key={sg.nom} title={`${sg.nom} ${sg.pct}%`} style={{ height: `${sg.pct}%`, background: sg.color }} />
                  ))}
                </div>
                <div className="text-center">
                  <div className="font-display text-[15px]">{w.semaine}</div>
                  <div className="text-[10px]" style={{ color: "#61789B" }}>
                    {w.titre}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-4 pt-3.5" style={{ borderTop: "1px solid var(--border)" }}>
            {THEMES.map((th) => (
              <div key={th.nom} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-body)" }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: th.color }} />
                {th.nom}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-baseline justify-between mb-4 gap-2 flex-wrap">
              <h2 className="font-display text-[19px] tracking-[0.06em]">Volume par filière</h2>
              <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                Cumul du cycle
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {volumeThemes.map((v) => (
                <div key={v.nom}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold">{v.nom}</span>
                    <span style={{ color: "var(--ink-secondary)" }}>
                      {v.metres} m · {v.pct}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-md" style={{ width: `${Math.min(100, v.pct * 2.2)}%`, background: v.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-baseline justify-between mb-4 gap-2 flex-wrap">
              <h2 className="font-display text-[19px] tracking-[0.06em]">Intensité cible</h2>
              <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                % FC max moyenne
              </span>
            </div>
            <div className="flex items-end gap-2.5" style={{ height: 120 }}>
              {courbeCharge.map((c) => (
                <div key={c.semaine} className="flex-1 flex flex-col justify-end items-center gap-1.5" style={{ height: "100%" }}>
                  <span className="text-xs font-bold" style={{ color: c.color }}>
                    {c.val}%
                  </span>
                  <div className="w-full rounded-t-md" style={{ height: `${c.val}%`, background: c.color }} />
                  <span className="text-xs" style={{ color: "#61789B" }}>
                    {c.semaine}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        {cycleSeances.map((s) => (
          <Card key={s.semaine} style={{ borderLeft: `4px solid ${s.color}` }}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] tracking-[0.14em] uppercase" style={{ color: "#61789B" }}>
                {s.semaine}
              </span>
              <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.07)", color: s.color }}>
                {s.charge}
              </span>
            </div>
            <h3 className="font-display text-xl mt-2.5 mb-1.5 tracking-[0.03em]">{s.titre}</h3>
            <div className="text-[13px] leading-[1.5]" style={{ color: "var(--ink-body)" }}>
              {s.detail}
            </div>
            <div className="flex gap-1.5 flex-wrap mt-3.5">
              {s.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-strong)", color: "var(--ink-body)" }}>
                  {t}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
