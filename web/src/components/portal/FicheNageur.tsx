"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatProgression } from "@/lib/chrono";
import { AllureVmaTool } from "./AllureVmaTool";
import { RadarChart, type RadarAxe } from "./RadarChart";

type Perf = { epreuve: string; temps: string; points: number; niveau: string; deltaSaison: string; rangNat: string; saison: string; tempsDebutSaison?: string | null };
type TechCritere = { nom: string; note: number };
type Technique = { nage: string; color: string; moyenne: number; criteres: TechCritere[] };
type AbsenceRow = { date: string; motif: string; statut: string };
type AssiduiteRow = { sem: string; pct: number; color: string };
type InscriptionRow = { saison: string; groupe: string; coach: string };

const NAGE_META: Record<string, { label: string; color: string }> = {
  PAPILLON: { label: "Papillon", color: "#E8442B" },
  DOS: { label: "Dos", color: "#24C8FF" },
  BRASSE: { label: "Brasse", color: "#F2B33D" },
  CRAWL: { label: "Crawl", color: "#1E7BFF" },
};

const STATUT_STYLE: Record<string, [string, string]> = {
  VALIDEE: ["rgba(46,204,143,0.14)", "#2ECC8F"],
  A_TRAITER: ["rgba(232,68,43,0.16)", "#E8442B"],
  BLESSURE: ["rgba(242,179,61,0.15)", "#F2B33D"],
};

type FfnResult = { iuf: string; nom: string };

export function FicheNageur({
  nageurId,
  perfs,
  saisonActive = null,
  technique,
  absences,
  presenceRate,
  pointsFFN,
  assiduite,
  criteresList,
  ffnIuf = null,
  ffnSyncedAt = null,
  membreDepuis = null,
  inscriptions = [],
}: {
  nageurId: string;
  perfs: Perf[];
  saisonActive?: string | null;
  technique: Technique[];
  absences: AbsenceRow[];
  presenceRate: number;
  pointsFFN: number;
  assiduite: AssiduiteRow[];
  criteresList: string[];
  ffnIuf?: string | null;
  ffnSyncedAt?: string | null;
  membreDepuis?: string | null;
  inscriptions?: InscriptionRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [notation, setNotation] = useState(false);
  const [nageActive, setNageActive] = useState("PAPILLON");
  const [notes, setNotes] = useState<Record<string, number>>({});
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);

  const [ffnSearchOpen, setFfnSearchOpen] = useState(false);
  const [ffnQuery, setFfnQuery] = useState("");
  const [ffnResults, setFfnResults] = useState<FfnResult[]>([]);
  const [ffnSearching, setFfnSearching] = useState(false);
  const [ffnSyncing, setFfnSyncing] = useState(false);
  const [ffnError, setFfnError] = useState<string | null>(null);

  async function searchFfn() {
    setFfnSearching(true);
    setFfnError(null);
    try {
      const res = await fetch(`/api/nageurs/${nageurId}/ffn?q=${encodeURIComponent(ffnQuery)}`);
      const data = await res.json();
      if (!res.ok) {
        setFfnError(data.error ?? "Erreur");
        return;
      }
      setFfnResults(data.results);
    } finally {
      setFfnSearching(false);
    }
  }

  async function linkAndSync(iuf: string) {
    setFfnSyncing(true);
    setFfnError(null);
    try {
      const res = await fetch(`/api/nageurs/${nageurId}/ffn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iuf }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFfnError(data.error ?? "Erreur");
        return;
      }
      setFfnSearchOpen(false);
      router.refresh();
    } finally {
      setFfnSyncing(false);
    }
  }

  async function resync() {
    setFfnSyncing(true);
    setFfnError(null);
    try {
      const res = await fetch(`/api/nageurs/${nageurId}/ffn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (!res.ok) {
        setFfnError(data.error ?? "Erreur");
        return;
      }
      router.refresh();
    } finally {
      setFfnSyncing(false);
    }
  }

  const tabs = ["Cotation FFN", "Notation technique", "Assiduité", "Évolution"];

  const radarAxes: RadarAxe[] = [
    ...technique.map((t) => ({ label: NAGE_META[t.nage]?.label ?? t.nage, value: t.moyenne, max: 5, couleur: t.color })),
    { label: "Vitesse (FFN)", value: Math.min(pointsFFN, 600), max: 600 },
    { label: "Assiduité", value: presenceRate, max: 100 },
  ];

  const perfsCourants = saisonActive ? perfs.filter((p) => p.saison === saisonActive) : perfs;

  const perfsParEpreuve = new Map<string, Perf[]>();
  for (const p of perfs) {
    const arr = perfsParEpreuve.get(p.epreuve) ?? [];
    arr.push(p);
    perfsParEpreuve.set(p.epreuve, arr);
  }
  for (const arr of perfsParEpreuve.values()) arr.sort((a, b) => a.saison.localeCompare(b.saison));

  async function saveNotation() {
    setSaving(true);
    try {
      const perNage = Object.fromEntries(
        Object.entries(notes)
          .filter(([k]) => k.startsWith(nageActive + "|"))
          .map(([k, v]) => [k.split("|")[1], v])
      );
      if (Object.keys(perNage).length > 0) {
        await fetch(`/api/nageurs/${nageurId}/notation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nage: nageActive, notes: perNage, observation }),
        });
      }
      setNotation(false);
      setNotes({});
      setObservation("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card padding={20} className="mb-4">
        <div className="flex gap-6 flex-wrap items-start">
          <div className="flex flex-col items-center shrink-0" style={{ minWidth: 260 }}>
            <RadarChart axes={radarAxes} size={240} />
            <div className="text-[11px] text-center mt-1" style={{ color: "var(--ink-tertiary)", maxWidth: 220 }}>
              Technique par nage (/5) · vitesse FFN (échelle 0-600+) · assiduité (%)
            </div>
          </div>
          <div className="flex-1" style={{ minWidth: 280 }}>
            <div className="text-[12px] tracking-[0.14em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
              Tableau temps bassin
            </div>
            <AllureVmaTool />
          </div>
        </div>
      </Card>

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className="rounded-[10px] px-4 py-2 text-[13px] font-semibold cursor-pointer"
            style={{
              border: `1px solid ${tab === i ? "#1E7BFF" : "var(--border-strong)"}`,
              background: tab === i ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)",
              color: tab === i ? "var(--ink)" : "var(--ink-body)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <Card padding={0} className="overflow-hidden mt-4">
          <div className="px-5 py-4 flex justify-between items-center flex-wrap gap-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h2 className="font-display text-[19px] tracking-[0.06em]">Meilleures performances · cotation FFN</h2>
              <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                {ffnIuf ? `IUF ${ffnIuf}${ffnSyncedAt ? ` · synchronisé le ${ffnSyncedAt}` : ""}` : "Pas encore relié à une fiche FFN"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {ffnError && (
                <span className="text-xs" style={{ color: "#FF9179" }}>
                  {ffnError}
                </span>
              )}
              {ffnIuf && (
                <button
                  onClick={resync}
                  disabled={ffnSyncing}
                  className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer"
                  style={{ border: "1px solid rgba(30,123,255,0.4)", background: "rgba(30,123,255,0.1)", color: "#7FDCFF", opacity: ffnSyncing ? 0.6 : 1 }}
                >
                  {ffnSyncing ? "Synchronisation…" : "Resynchroniser"}
                </button>
              )}
              <button
                onClick={() => setFfnSearchOpen(true)}
                className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer"
                style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              >
                {ffnIuf ? "Changer le lien FFN" : "Relier à une fiche FFN"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {["Épreuve", "Temps", "Points", "Niveau", "Progression saison", "Rang Nat."].map((h, i) => (
                    <th key={h} className="text-[12px] tracking-[0.12em] uppercase px-3 py-2.5" style={{ color: "var(--ink-tertiary)", textAlign: i === 0 ? "left" : "right", paddingLeft: i === 0 ? 20 : 12, paddingRight: i === 5 ? 20 : 12 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfsCourants.map((p) => (
                  <tr key={p.epreuve} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-5 py-3 text-sm font-semibold">{p.epreuve}</td>
                    <td className="px-3 py-3 text-right font-display text-lg">{p.temps}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold" style={{ color: "#7FDCFF" }}>
                      {p.points}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className="text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-md"
                        style={{
                          background: p.niveau === "National" ? "rgba(232,68,43,0.16)" : "rgba(30,123,255,0.16)",
                          color: p.niveau === "National" ? "#FF9179" : "#7FDCFF",
                        }}
                      >
                        {p.niveau}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-bold" title="Écart avec le temps de cette épreuve au premier pointage de la saison">
                      {(() => {
                        const progression = p.tempsDebutSaison ? formatProgression(p.temps, p.tempsDebutSaison) : null;
                        if (!progression || p.temps === p.tempsDebutSaison) return <span style={{ color: "var(--ink-muted)" }}>—</span>;
                        return <span style={{ color: progression.startsWith("−") ? "#2ECC8F" : "#E8442B" }}>{progression}</span>;
                      })()}
                    </td>
                    <td className="px-5 py-3 text-right text-[13px]" style={{ color: "var(--ink-body)" }}>
                      {p.rangNat}
                    </td>
                  </tr>
                ))}
                {perfsCourants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-sm text-center" style={{ color: "var(--ink-secondary)" }}>
                      Aucune performance enregistrée{saisonActive ? ` pour la saison ${saisonActive}` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 1 && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Notation par critère, échelle 1 à 5.
            </div>
            <button
              onClick={() => setNotation(true)}
              className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
              style={{ background: "linear-gradient(135deg,#E8442B,#B92E19)", color: "#fff" }}
            >
              ＋ Saisir une notation technique
            </button>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
            {technique.map((n) => (
              <Card key={n.nage} style={{ borderTop: `3px solid ${n.color}` }}>
                <div className="flex justify-between items-center mb-3.5">
                  <h3 className="font-display text-[19px] tracking-[0.06em]">{NAGE_META[n.nage]?.label ?? n.nage}</h3>
                  <span className="font-display text-2xl" style={{ color: n.color }}>
                    {n.moyenne.toFixed(1)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {n.criteres.map((c) => (
                    <div key={c.nom}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: "var(--ink-body)" }}>{c.nom}</span>
                        <span className="font-bold">{c.note}/5</span>
                      </div>
                      <div className="h-1.5 rounded" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-full rounded" style={{ width: `${(c.note / 5) * 100}%`, background: n.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
          <Card>
            <div className="flex items-baseline justify-between mb-3.5 gap-2 flex-wrap">
              <h2 className="font-display text-[19px] tracking-[0.06em]">Assiduité</h2>
              <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                8 dernières semaines pointées
              </span>
            </div>
            {assiduite.length === 0 ? (
              <>
                <div className="font-display text-[42px] leading-none" style={{ color: presenceRate >= 80 ? "#2ECC8F" : presenceRate >= 65 ? "#F2B33D" : "#E8442B" }}>
                  {presenceRate}%
                </div>
                <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
                  Taux de présence suivi · pas encore de séance pointée sur les 8 dernières semaines
                </div>
              </>
            ) : (
              <div className="flex items-end gap-2" style={{ height: 150 }}>
                {assiduite.map((a) => (
                  <div key={a.sem} className="flex-1 flex flex-col justify-end items-center gap-1.5" style={{ height: "100%" }}>
                    <span className="text-[11px] font-bold" style={{ color: a.color }}>
                      {a.pct}%
                    </span>
                    <div className="w-full rounded-t-md" style={{ height: `${Math.max(a.pct, 4)}%`, background: a.color }} />
                    <span className="text-[10px]" style={{ color: "var(--ink-tertiary)" }}>
                      {a.sem}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h2 className="font-display text-[19px] tracking-[0.06em] mb-3.5">Absences déclarées</h2>
            <div className="flex flex-col gap-2">
              {absences.length === 0 && (
                <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Aucune absence déclarée.
                </div>
              )}
              {absences.map((a, i) => {
                const [bg, fg] = STATUT_STYLE[a.statut] ?? STATUT_STYLE.VALIDEE;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-[11px] px-3.5 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <div className="text-sm font-semibold" style={{ minWidth: 74 }}>
                      {a.date}
                    </div>
                    <div className="flex-1 text-[13px]" style={{ color: "var(--ink-body)" }}>
                      {a.motif}
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-md" style={{ background: bg, color: fg }}>
                      {a.statut === "A_TRAITER" ? "À traiter" : a.statut === "BLESSURE" ? "Blessure" : "Validée"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === 3 && (
        <div className="mt-4 flex flex-col gap-4">
          <Card padding={0} className="overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-display text-[19px] tracking-[0.06em]">Parcours au club</h2>
              <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                {membreDepuis ? `Membre depuis le ${membreDepuis}` : "Date d'arrivée au club non renseignée"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 480 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                    {["Saison", "Groupe", "Coach"].map((h) => (
                      <th key={h} className="text-[12px] tracking-[0.12em] uppercase px-5 py-2.5 text-left" style={{ color: "var(--ink-tertiary)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.map((i) => (
                    <tr key={i.saison} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="px-5 py-3 text-sm font-semibold">{i.saison}</td>
                      <td className="px-5 py-3 text-sm">{i.groupe}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "var(--ink-body)" }}>
                        {i.coach}
                      </td>
                    </tr>
                  ))}
                  {inscriptions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-sm text-center" style={{ color: "var(--ink-secondary)" }}>
                        Pas encore d&apos;historique de saison pour ce nageur.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card padding={0} className="overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-display text-[19px] tracking-[0.06em]">Évolution des temps par épreuve</h2>
              <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                Saison par saison, à partir des synchronisations FFN
              </span>
            </div>
            <div className="flex flex-col" style={{ borderTop: "1px solid var(--border)" }}>
              {Array.from(perfsParEpreuve.entries()).map(([epreuve, rows]) => (
                <div key={epreuve} className="px-5 py-3.5 flex items-center gap-3 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="text-sm font-semibold" style={{ minWidth: 120 }}>
                    {epreuve}
                  </div>
                  <div className="flex-1 flex items-center gap-4 flex-wrap">
                    {rows.map((r, i) => (
                      <div key={r.saison} className="flex items-center gap-2 text-[13px]">
                        {i > 0 && (
                          <span style={{ color: "var(--ink-muted)" }}>→</span>
                        )}
                        <span style={{ color: "var(--ink-secondary)" }}>{r.saison}</span>
                        <span className="font-display text-base" style={{ color: "#7FDCFF" }}>
                          {r.temps}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {perfsParEpreuve.size === 0 && (
                <div className="px-5 py-6 text-sm text-center" style={{ color: "var(--ink-secondary)" }}>
                  Aucune performance enregistrée pour l&apos;instant.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {notation && (
        <div
          onClick={() => setNotation(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-2xl overflow-y-auto"
            style={{ maxWidth: 640, maxHeight: "88vh", background: "#101A2B", border: "1px solid var(--border-strong)", boxShadow: "0 30px 90px rgba(0,0,0,0.6)" }}
          >
            <div className="px-6 py-5 flex justify-between items-center sticky top-0" style={{ borderBottom: "1px solid var(--border-strong)", background: "#101A2B" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">Notation technique</h2>
              <button onClick={() => setNotation(false)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="text-[12px] tracking-[0.12em] uppercase mb-2.5" style={{ color: "var(--ink-tertiary)" }}>
                Nage évaluée
              </div>
              <div className="flex gap-2 flex-wrap mb-5">
                {Object.entries(NAGE_META).map(([key, meta]) => {
                  const active = nageActive === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setNageActive(key)}
                      className="rounded-[9px] px-4 py-2 text-[13px] font-semibold cursor-pointer"
                      style={{
                        border: `1px solid ${active ? meta.color : "var(--border-strong)"}`,
                        background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                        color: active ? "var(--ink)" : "var(--ink-body)",
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3.5">
                {criteresList.map((critere) => {
                  const key = `${nageActive}|${critere}`;
                  return (
                    <div key={critere} className="flex items-center gap-3.5 flex-wrap">
                      <div className="flex-1 text-sm font-semibold" style={{ minWidth: 130 }}>
                        {critere}
                      </div>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((v) => {
                          const on = notes[key] === v;
                          return (
                            <button
                              key={v}
                              onClick={() => setNotes((prev) => ({ ...prev, [key]: v }))}
                              className="w-10 h-10 rounded-[10px] font-display text-[17px] cursor-pointer"
                              style={{
                                border: `1px solid ${on ? "#24C8FF" : "var(--border-strong)"}`,
                                background: on ? "rgba(36,200,255,0.2)" : "rgba(255,255,255,0.04)",
                                color: on ? "var(--ink)" : "var(--ink-secondary)",
                              }}
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5">
                <div className="text-[12px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
                  Observation
                </div>
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  rows={3}
                  placeholder="Point de vigilance, éducatif à prescrire…"
                  className="w-full rounded-[10px] p-3 text-sm outline-none resize-y"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
              </div>
            </div>
            <div className="px-6 pb-5 pt-4 flex gap-2.5 justify-end flex-wrap">
              <button onClick={() => setNotation(false)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button
                onClick={saveNotation}
                disabled={saving}
                className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Enregistrement…" : "Enregistrer la notation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {ffnSearchOpen && (
        <div onClick={() => setFfnSearchOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl" style={{ maxWidth: 480, background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">Relier à une fiche FFN</h2>
              <button onClick={() => setFfnSearchOpen(false)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3.5">
              <div className="flex gap-2">
                <input
                  value={ffnQuery}
                  onChange={(e) => setFfnQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchFfn()}
                  placeholder="Nom Prénom (4 caractères min.)"
                  className="flex-1 rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
                <button
                  onClick={searchFfn}
                  disabled={ffnSearching || ffnQuery.trim().length < 4}
                  className="rounded-[9px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: ffnSearching ? 0.7 : 1 }}
                >
                  {ffnSearching ? "…" : "Chercher"}
                </button>
              </div>
              {ffnError && (
                <div className="text-[13px]" style={{ color: "#FF9179" }}>
                  {ffnError}
                </div>
              )}
              <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
                {ffnResults.map((r) => (
                  <button
                    key={r.iuf}
                    onClick={() => linkAndSync(r.iuf)}
                    disabled={ffnSyncing}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }}
                  >
                    <span className="text-sm font-semibold">{r.nom}</span>
                    <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                      IUF {r.iuf}
                    </span>
                  </button>
                ))}
                {ffnResults.length === 0 && !ffnSearching && (
                  <div className="text-[13px] text-center py-4" style={{ color: "var(--ink-secondary)" }}>
                    Cherche un nom pour voir les résultats.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
