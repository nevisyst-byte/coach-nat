"use client";

import { useState } from "react";
import { Card, Chip } from "@/components/ui/Card";
import { genererSeance, type Bloc } from "@/lib/seance-generator";
import { nouvelleSection, nouvelleSet, buildManualBlocs, volumeTotalManuel, distanceSection, fmtDistance, type SectionManuelle } from "@/lib/seance-manual";

const AXES = [
  { key: "variant" as const, titre: "Variant", aide: "Support technique", options: ["Nage complète", "Bras", "Jambes", "Éducatif"] },
  { key: "intensite" as const, titre: "Intensité", aide: "Allure de travail", options: ["Allure neutre", "Négatif split", "Progressif", "Allure 400", "Allure 200", "Vitesse"] },
  { key: "nage" as const, titre: "Nages", aide: "Support de nage", options: ["4 nages", "Spécialité", "Papillon", "Dos", "Brasse", "Crawl"] },
];

const VOLUMES = ["1 500 m", "2 000 m", "2 500 m", "3 000 m", "3 500 m", "4 000 m", "5 000 m", "6 000 m", "7 000 m", "8 000 m", "9 000 m", "10 000 m"];

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

type Modele = { id: string; nom: string; groupeNom: string; variant: string; intensite: string; nage: string; volumeCible: number; blocs: Bloc[] };

export function SeanceCreator({ groupes, modeles: modelesInitiaux }: { groupes: string[]; modeles: Modele[] }) {
  const [variant, setVariant] = useState("Nage complète");
  const [intensite, setIntensite] = useState("Allure 400");
  const [nage, setNage] = useState("4 nages");
  const [groupe, setGroupe] = useState(groupes[0] ?? "");
  const [volume, setVolume] = useState("3 000 m");
  const [date, setDate] = useState(todayInput());
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [blocs, setBlocs] = useState<Bloc[] | null>(null);

  const [modeles, setModeles] = useState(modelesInitiaux);
  const [nomModele, setNomModele] = useState("");
  const [modeleChargeId, setModeleChargeId] = useState<string | null>(null);

  const [mode, setMode] = useState<"auto" | "manuel">("auto");
  const [heureDebut, setHeureDebut] = useState("18:00");
  const [sections, setSections] = useState<SectionManuelle[]>([nouvelleSection("Échauffement")]);

  function chargerModele(m: Modele) {
    setMode("auto");
    setVariant(m.variant);
    setIntensite(m.intensite);
    setNage(m.nage);
    setGroupe(m.groupeNom);
    const vol = VOLUMES.find((v) => parseInt(v.replace(/\s/g, ""), 10) === m.volumeCible);
    if (vol) setVolume(vol);
    setBlocs(m.blocs);
    setNomModele(m.nom);
    setModeleChargeId(m.id);
    setSaved(null);
  }

  function nouveauModele() {
    setNomModele("");
    setModeleChargeId(null);
  }

  async function supprimerModele(id: string) {
    await fetch(`/api/seances/${id}`, { method: "DELETE" });
    setModeles((prev) => prev.filter((m) => m.id !== id));
    if (modeleChargeId === id) nouveauModele();
  }

  const axesState: Record<string, [string, (v: string) => void]> = {
    variant: [variant, setVariant],
    intensite: [intensite, setIntensite],
    nage: [nage, setNage],
  };

  const volumeCible = parseInt(volume.replace(/\s/g, ""), 10);

  function generer() {
    setBlocs(genererSeance(variant, intensite, nage, volumeCible).blocs);
    setSaved(null);
  }

  function updateBloc(index: number, field: "distance" | "contenu" | "consigne", value: string) {
    setBlocs((prev) => (prev ? prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)) : prev));
  }

  function ajouterSection() {
    setSections((prev) => [...prev, nouvelleSection()]);
  }

  function supprimerSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function renommerSection(id: string, nom: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, nom } : s)));
  }

  function ajouterSet(sectionId: string) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, sets: [...s.sets, nouvelleSet()] } : s)));
  }

  function supprimerSet(sectionId: string, setId: string) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, sets: s.sets.filter((x) => x.id !== setId) } : s)));
  }

  function updateSet(sectionId: string, setId: string, field: "reps" | "distance" | "label" | "allure" | "repos", value: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              sets: s.sets.map((x) =>
                x.id === setId ? { ...x, [field]: field === "reps" || field === "distance" ? parseInt(value, 10) || 0 : value } : x
              ),
            }
          : s
      )
    );
  }

  function construireManuel() {
    setBlocs(buildManualBlocs(heureDebut, sections));
    setSaved(null);
  }

  const variantEnvoi = mode === "manuel" ? "Saisie manuelle" : variant;
  const intensiteEnvoi = mode === "manuel" ? "—" : intensite;
  const nageEnvoi = mode === "manuel" ? "—" : nage;
  const volumeEnvoi = mode === "manuel" ? volumeTotalManuel(sections) : volumeCible;

  async function planifier() {
    if (!blocs) return;
    setSaving(true);
    setSaved(null);
    try {
      await fetch("/api/seance-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, groupeNom: groupe, variant: variantEnvoi, intensite: intensiteEnvoi, nage: nageEnvoi, volumeNage: volumeEnvoi, blocs }),
      });
      setSaved(`Séance planifiée le ${new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR")} — elle compte désormais dans la charge du groupe.`);
    } finally {
      setSaving(false);
    }
  }

  async function enregistrerModele() {
    if (!nomModele.trim() || !blocs) return;
    setSaving(true);
    setSaved(null);
    try {
      const payload = { nom: nomModele.trim(), groupeNom: groupe, variant: variantEnvoi, intensite: intensiteEnvoi, nage: nageEnvoi, volumeCible: volumeEnvoi, blocs };
      if (modeleChargeId) {
        await fetch(`/api/seances/${modeleChargeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setModeles((prev) => prev.map((m) => (m.id === modeleChargeId ? { ...m, ...payload } : m)).sort((a, b) => (a.id === modeleChargeId ? -1 : b.id === modeleChargeId ? 1 : 0)));
        setSaved(`Modèle « ${payload.nom} » mis à jour.`);
      } else {
        const res = await fetch("/api/seances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        setModeles((prev) => [{ id: data.id, ...payload }, ...prev]);
        setModeleChargeId(data.id);
        setSaved(`Modèle « ${payload.nom} » enregistré (réutilisable, sans date).`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 items-start grid-cols-1 lg:[grid-template-columns:260px_repeat(auto-fit,minmax(330px,1fr))]">
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-[17px] tracking-[0.1em] uppercase">Modèles enregistrés</h3>
        </div>
        <div className="flex flex-col gap-1.5" style={{ maxHeight: 420, overflowY: "auto" }}>
          {modeles.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-[9px] px-3 py-2 cursor-pointer"
              onClick={() => chargerModele(m)}
              style={{
                background: modeleChargeId === m.id ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${modeleChargeId === m.id ? "#1E7BFF" : "var(--border-strong)"}`,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{m.nom}</div>
                <div className="text-[11px] truncate" style={{ color: "var(--ink-secondary)" }}>
                  {m.groupeNom}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  supprimerModele(m.id);
                }}
                className="text-xs cursor-pointer shrink-0"
                style={{ color: "var(--ink-muted)" }}
                title="Supprimer ce modèle"
              >
                ✕
              </button>
            </div>
          ))}
          {modeles.length === 0 && (
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Aucun modèle enregistré pour l&apos;instant.
            </div>
          )}
        </div>
        {modeleChargeId && (
          <button onClick={nouveauModele} className="self-start text-[12px] cursor-pointer underline" style={{ color: "var(--ink-muted)" }}>
            + Nouveau modèle (au lieu de modifier)
          </button>
        )}
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div className="flex gap-2">
          <Chip active={mode === "auto"} onClick={() => setMode("auto")}>
            Génération auto
          </Chip>
          <Chip active={mode === "manuel"} onClick={() => setMode("manuel")}>
            Saisie manuelle
          </Chip>
        </div>

        {mode === "auto" ? (
          <>
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
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Date de la séance
                </div>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
              </div>
            </div>

            <button onClick={generer} className="rounded-[10px] py-3 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}>
              {blocs ? "↻ Régénérer" : "Générer"}
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3.5">
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
                  Date
                </div>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Heure de début
                </div>
                <input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {sections.map((section) => (
                <div key={section.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <input
                      value={section.nom}
                      onChange={(e) => renommerSection(section.id, e.target.value)}
                      placeholder="Nom de la section (ex. Échauffement)"
                      className="flex-1 font-display text-sm tracking-[0.04em] uppercase bg-transparent outline-none"
                      style={{ color: "var(--ink)" }}
                    />
                    <span className="text-xs shrink-0" style={{ color: "var(--ink-secondary)" }}>
                      {fmtDistance(distanceSection(section))}
                    </span>
                    <button onClick={() => supprimerSection(section.id)} className="text-xs cursor-pointer shrink-0" style={{ color: "var(--ink-muted)" }} title="Supprimer la section">
                      ✕
                    </button>
                  </div>

                  <div className="grid gap-1.5 text-[10px] tracking-[0.08em] uppercase mb-1" style={{ gridTemplateColumns: "56px 64px 1fr 64px 64px 20px", color: "#61789B" }}>
                    <span>Rép.</span>
                    <span>Dist.</span>
                    <span>Contenu</span>
                    <span>Départ</span>
                    <span>Repos</span>
                    <span />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {section.sets.map((s) => (
                      <div key={s.id} className="grid gap-1.5 items-center" style={{ gridTemplateColumns: "56px 64px 1fr 64px 64px 20px" }}>
                        <input
                          type="number"
                          value={s.reps}
                          onChange={(e) => updateSet(section.id, s.id, "reps", e.target.value)}
                          className="rounded-md px-1.5 py-1.5 text-xs outline-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                        />
                        <input
                          type="number"
                          value={s.distance}
                          onChange={(e) => updateSet(section.id, s.id, "distance", e.target.value)}
                          className="rounded-md px-1.5 py-1.5 text-xs outline-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                        />
                        <input
                          value={s.label}
                          onChange={(e) => updateSet(section.id, s.id, "label", e.target.value)}
                          placeholder="ex. 4 nages, Papillon — Vert…"
                          className="rounded-md px-1.5 py-1.5 text-xs outline-none min-w-0"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                        />
                        <input
                          value={s.allure}
                          onChange={(e) => updateSet(section.id, s.id, "allure", e.target.value)}
                          placeholder="3:40"
                          title="Départ / allure par répétition (mm:ss)"
                          className="rounded-md px-1.5 py-1.5 text-xs outline-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                        />
                        <input
                          value={s.repos}
                          onChange={(e) => updateSet(section.id, s.id, "repos", e.target.value)}
                          placeholder="0:40"
                          title="Repos après la série (mm:ss)"
                          className="rounded-md px-1.5 py-1.5 text-xs outline-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                        />
                        <button onClick={() => supprimerSet(section.id, s.id)} className="text-xs cursor-pointer" style={{ color: "var(--ink-muted)" }} title="Supprimer cette série">
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
            </div>

            <button onClick={ajouterSection} className="rounded-[10px] py-2 text-[12px] font-semibold cursor-pointer" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-secondary)" }}>
              + Nouvelle section
            </button>

            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                Total : <strong style={{ color: "var(--ink)" }}>{fmtDistance(volumeTotalManuel(sections))}</strong>
              </span>
            </div>

            <button onClick={construireManuel} className="rounded-[10px] py-3 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}>
              {blocs ? "↻ Reconstruire l'aperçu" : "Construire l'aperçu"}
            </button>
          </>
        )}
      </Card>

      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(180deg,#122341,#0C1524)", border: "1px solid var(--border-strong)" }}>
        <div className="flex justify-between items-baseline mb-1.5 gap-2 flex-wrap">
          <h2 className="font-display text-[22px] tracking-[0.05em]">Séance générée</h2>
          <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
            {mode === "manuel" ? fmtDistance(volumeTotalManuel(sections)) : volume} · {groupe}
          </span>
        </div>
        <div className="text-[13px] mb-4" style={{ color: "#7FDCFF" }}>
          {mode === "manuel" ? `Saisie manuelle · départ ${heureDebut}` : `${variant} · ${intensite} · ${nage} · ${volume}`}
        </div>

        {blocs ? (
          <>
            <div className="text-[11px] mb-2.5" style={{ color: "var(--ink-muted)" }}>
              Modifiable — clique dans un champ pour ajuster distance, contenu ou consigne.
            </div>
            <div className="flex flex-col gap-2.5">
              {blocs.map((b, i) => (
                <div key={i} className="flex gap-3.5 rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
                  <div style={{ minWidth: 84 }}>
                    <div className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "#61789B" }}>
                      {b.phase}
                    </div>
                    <input
                      value={b.distance}
                      onChange={(e) => updateBloc(i, "distance", e.target.value)}
                      className="font-display text-lg bg-transparent outline-none w-full"
                      style={{ color: "var(--ink)" }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <textarea
                      value={b.contenu}
                      onChange={(e) => updateBloc(i, "contenu", e.target.value)}
                      rows={Math.max(1, b.contenu.split("\n").length)}
                      className="text-sm font-semibold bg-transparent outline-none w-full resize-none"
                      style={{ color: "var(--ink)" }}
                    />
                    <input
                      value={b.consigne}
                      onChange={(e) => updateBloc(i, "consigne", e.target.value)}
                      className="text-xs bg-transparent outline-none w-full"
                      style={{ color: "var(--ink-secondary)" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-[13px] text-center py-10 rounded-xl" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-secondary)" }}>
            Choisis tes réglages à gauche puis clique sur « Générer » pour construire la séance.
            <br />
            Tu pourras ensuite modifier chaque bloc à la main avant de l&apos;enregistrer ou de la planifier.
          </div>
        )}

        <div className="mt-5">
          <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
            Nom du modèle
          </div>
          <input
            value={nomModele}
            onChange={(e) => setNomModele(e.target.value)}
            placeholder="ex. Vitesse crawl pré-compét"
            className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
          />
        </div>
        <div className="flex gap-2.5 mt-3 flex-wrap">
          <button onClick={planifier} disabled={saving || !blocs} className="flex-1 rounded-[10px] py-3 text-[13px] font-bold cursor-pointer" style={{ minWidth: 130, background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving || !blocs ? 0.5 : 1 }}>
            {saving ? "Enregistrement…" : "Planifier la séance"}
          </button>
          <button onClick={enregistrerModele} disabled={saving || !nomModele.trim() || !blocs} className="flex-1 rounded-[10px] py-3 text-[13px] font-semibold cursor-pointer" style={{ minWidth: 130, border: "1px solid var(--border-strong)", color: "var(--ink)", opacity: !nomModele.trim() || !blocs ? 0.5 : 1 }}>
            {modeleChargeId ? `Mettre à jour « ${nomModele.trim() || "…"} »` : "Enregistrer sous ce nom"}
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
