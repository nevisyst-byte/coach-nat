"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
import { mondayOf, toDateInputValue } from "@/lib/week";

const SEMAINES_AFFICHEES = 16;
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

type Phase = { id: string; theme: string; dateDebut: string; dateFin: string };
type Groupe = { id: string; nom: string; objectifManuel: string | null; phases: Phase[] };
type Section = { pole: string; nom: string; color: string; groupes: Groupe[] };

function ajouterJours(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function memeJour(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dureeEnSemaines(dateDebut: string, dateFin: string) {
  const jours = Math.round((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000) + 1;
  return Math.max(1, Math.round(jours / 7));
}

export function PlanningObjectifsClient({ groupesParPole, isAdmin }: { groupesParPole: Section[]; isAdmin: boolean }) {
  const router = useRouter();
  const lundiCourant = useMemo(() => mondayOf(new Date()), []);
  const semaines = useMemo(() => Array.from({ length: SEMAINES_AFFICHEES }, (_, i) => ajouterJours(lundiCourant, i * 7)), [lundiCourant]);

  const [editing, setEditing] = useState<Groupe | null>(null);
  const [form, setForm] = useState({ theme: OBJECTIFS[0].nom, dateDebut: toDateInputValue(lundiCourant), dureeSemaines: 4 });
  const [saving, setSaving] = useState(false);

  function couleurSemaine(groupe: Groupe, semaine: Date) {
    const phase = groupe.phases.find((p) => new Date(p.dateDebut) <= semaine && semaine <= new Date(p.dateFin));
    return phase ? couleurObjectif(phase.theme) : null;
  }

  function libelleSemaine(groupe: Groupe, semaine: Date) {
    const phase = groupe.phases.find((p) => new Date(p.dateDebut) <= semaine && semaine <= new Date(p.dateFin));
    return phase ? phase.theme : "Aucune phase planifiée";
  }

  function ouvrirEdition(groupe: Groupe) {
    const derniere = groupe.phases[groupe.phases.length - 1];
    const debutParDefaut = derniere ? ajouterJours(new Date(derniere.dateFin), 1) : lundiCourant;
    setForm({ theme: OBJECTIFS[0].nom, dateDebut: toDateInputValue(debutParDefaut), dureeSemaines: 4 });
    setEditing(groupe);
  }

  async function ajouterPhase() {
    if (!editing) return;
    setSaving(true);
    try {
      await fetch("/api/phases-objectif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupeId: editing.id, theme: form.theme, dateDebut: form.dateDebut, dureeSemaines: form.dureeSemaines }),
      });
      router.refresh();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function supprimerPhase(id: string) {
    await fetch(`/api/phases-objectif/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
        Configure, pour chaque groupe, une suite de phases (ex. 4 semaines Vitesse puis Volume aérobie) — l&apos;objectif
        affiché sur ses créneaux (Planning, Semaine type) suit automatiquement la phase en cours, sans rien à retoucher
        à la main une fois planifié.
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 220 + SEMAINES_AFFICHEES * 56 }}>
            <div className="flex" style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
              <div className="shrink-0 px-3.5 py-2.5 text-[10px] tracking-[0.1em] uppercase" style={{ width: 220, color: "#61789B" }}>
                Groupe
              </div>
              {semaines.map((s, i) => (
                <div
                  key={i}
                  className="shrink-0 text-center py-2.5 text-[10px]"
                  style={{ width: 56, color: memeJour(s, lundiCourant) ? "#24C8FF" : "#61789B", fontWeight: memeJour(s, lundiCourant) ? 700 : 400 }}
                >
                  {s.getDate()} {MOIS[s.getMonth()]}
                </div>
              ))}
            </div>

            {groupesParPole.map((section) => (
              <div key={section.pole}>
                <div className="flex items-center gap-2 px-3.5 py-2" style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)", borderLeft: `3px solid ${section.color}` }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: section.color }} />
                  <span className="font-display text-[13px] tracking-[0.05em] uppercase">{section.nom}</span>
                </div>
                {section.groupes.map((groupe) => (
                  <div key={groupe.id} className="flex items-stretch" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 220 }} className="shrink-0 px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{groupe.nom}</span>
                      {isAdmin && (
                        <button onClick={() => ouvrirEdition(groupe)} className="text-xs cursor-pointer shrink-0" style={{ color: "var(--cyan)" }} title="Planifier une phase">
                          + phase
                        </button>
                      )}
                    </div>
                    {semaines.map((s, i) => {
                      const color = couleurSemaine(groupe, s);
                      return (
                        <div key={i} className="shrink-0 flex items-center justify-center" style={{ width: 56, padding: "6px 3px" }}>
                          <div
                            className="w-full rounded"
                            style={{
                              height: 22,
                              background: color ? `${color}55` : "rgba(255,255,255,0.03)",
                              border: `1px solid ${memeJour(s, lundiCourant) ? "#24C8FF" : color ?? "var(--border)"}`,
                            }}
                            title={`${libelleSemaine(groupe, s)} — semaine du ${s.getDate()}/${s.getMonth() + 1}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {OBJECTIFS.map((o) => (
          <div key={o.nom} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-body)" }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: o.color }} />
            {o.nom}
          </div>
        ))}
      </div>

      {editing && (
        <div onClick={() => setEditing(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 480, maxHeight: "85vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[20px] tracking-[0.05em]">Phases — {editing.nom}</h2>
              <button onClick={() => setEditing(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto flex flex-col gap-1.5">
              {editing.phases.length === 0 && (
                <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Aucune phase planifiée — l&apos;objectif affiché reste celui réglé à la main sur Groupes
                  {editing.objectifManuel ? ` (« ${editing.objectifManuel} »)` : ""}.
                </div>
              )}
              {editing.phases.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${couleurObjectif(p.theme)}55` }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: couleurObjectif(p.theme) }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.theme}</div>
                    <div className="text-[11px]" style={{ color: "var(--ink-secondary)" }}>
                      Du {new Date(p.dateDebut).toLocaleDateString("fr-FR")} au {new Date(p.dateFin).toLocaleDateString("fr-FR")} · {dureeEnSemaines(p.dateDebut, p.dateFin)} sem.
                    </div>
                  </div>
                  <button onClick={() => supprimerPhase(p.id)} className="text-xs cursor-pointer shrink-0" style={{ color: "var(--ink-muted)" }} title="Supprimer">
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="text-[11px] tracking-[0.12em] uppercase" style={{ color: "#61789B" }}>
                Ajouter une phase
              </div>
              <div className="grid gap-2.5" style={{ gridTemplateColumns: "1.3fr 1fr 90px" }}>
                <select
                  value={form.theme}
                  onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
                  className="rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: couleurObjectif(form.theme) }}
                >
                  {OBJECTIFS.map((o) => (
                    <option key={o.nom} value={o.nom} style={{ background: "#101A2B", color: o.color }}>
                      {o.nom}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={form.dateDebut}
                  onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
                  className="rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={form.dureeSemaines}
                    onChange={(e) => setForm((f) => ({ ...f, dureeSemaines: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                    className="rounded-[9px] px-2.5 py-2.5 text-sm outline-none w-full"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                  <span className="text-[11px] shrink-0" style={{ color: "var(--ink-secondary)" }}>
                    sem.
                  </span>
                </div>
              </div>
              <button
                onClick={ajouterPhase}
                disabled={saving}
                className="rounded-[10px] py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Enregistrement…" : "+ Ajouter cette phase"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
