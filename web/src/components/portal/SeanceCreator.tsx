"use client";

import { useMemo, useState } from "react";
import { Card, Chip } from "@/components/ui/Card";
import { genererSeance } from "@/lib/seance-generator";

const AXES = [
  { key: "variant" as const, titre: "Variant", aide: "Support technique", options: ["Nage complète", "Bras", "Jambes", "Éducatif"] },
  { key: "intensite" as const, titre: "Intensité", aide: "Allure de travail", options: ["Allure neutre", "Négatif split", "Progressif", "Allure 400", "Allure 200", "Vitesse"] },
  { key: "nage" as const, titre: "Nages", aide: "Support de nage", options: ["4 nages", "Spécialité", "Papillon", "Dos", "Brasse", "Crawl"] },
];

const VOLUMES = ["1 500 m", "2 000 m", "2 500 m", "3 000 m", "3 500 m", "4 000 m", "5 000 m", "6 000 m", "7 000 m", "8 000 m", "9 000 m", "10 000 m"];

export function SeanceCreator({ groupes }: { groupes: string[] }) {
  const [variant, setVariant] = useState("Nage complète");
  const [intensite, setIntensite] = useState("Allure 400");
  const [nage, setNage] = useState("4 nages");
  const [groupe, setGroupe] = useState(groupes[0] ?? "");
  const [volume, setVolume] = useState("3 000 m");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const axesState: Record<string, [string, (v: string) => void]> = {
    variant: [variant, setVariant],
    intensite: [intensite, setIntensite],
    nage: [nage, setNage],
  };

  const volumeCible = parseInt(volume.replace(/\s/g, ""), 10);
  const { resume, blocs } = useMemo(() => genererSeance(variant, intensite, nage, volumeCible), [variant, intensite, nage, volumeCible]);

  async function save() {
    setSaving(true);
    setSaved(null);
    try {
      await fetch("/api/seances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupeNom: groupe, variant, intensite, nage, volumeCible, blocs }),
      });
      setSaved("Séance enregistrée.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 items-start" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))" }}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {AXES.map((ax) => {
          const [value, setValue] = axesState[ax.key];
          return (
            <div key={ax.key}>
              <div className="flex items-baseline justify-between mb-2.5">
                <h3 className="font-display text-[17px] tracking-[0.1em] uppercase">{ax.titre}</h3>
                <span className="text-xs" style={{ color: "#61789B" }}>
                  {ax.aide}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ax.options.map((o) => (
                  <Chip key={o} active={value === o} onClick={() => setValue(o)}>
                    {o}
                  </Chip>
                ))}
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-3.5">
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
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
              Volume cible
            </div>
            <select value={volume} onChange={(e) => setVolume(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
              {VOLUMES.map((v) => (
                <option key={v} value={v} style={{ background: "#101A2B" }}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(180deg,#122341,#0C1524)", border: "1px solid var(--border-strong)" }}>
        <div className="flex justify-between items-baseline mb-1.5 gap-2 flex-wrap">
          <h2 className="font-display text-[22px] tracking-[0.05em]">Séance générée</h2>
          <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
            {volume} · {groupe}
          </span>
        </div>
        <div className="text-[13px] mb-4" style={{ color: "#7FDCFF" }}>
          {resume}
        </div>
        <div className="flex flex-col gap-2.5">
          {blocs.map((b) => (
            <div key={b.phase} className="flex gap-3.5 rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
              <div style={{ minWidth: 64 }}>
                <div className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "#61789B" }}>
                  {b.phase}
                </div>
                <div className="font-display text-lg">{b.distance}</div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{b.contenu}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                  {b.consigne}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2.5 mt-5 flex-wrap">
          <button onClick={save} disabled={saving} className="flex-1 rounded-[10px] py-3 text-[13px] font-bold cursor-pointer" style={{ minWidth: 130, background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Enregistrement…" : "Planifier la séance"}
          </button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-[10px] py-3 text-[13px] font-semibold cursor-pointer" style={{ minWidth: 130, border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
            Enregistrer le modèle
          </button>
        </div>
        {saved && (
          <div className="mt-3 text-[13px]" style={{ color: "#2ECC8F" }}>
            {saved}
          </div>
        )}
      </div>
    </div>
  );
}
