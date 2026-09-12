"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ETAT_COLOR, ETAT_LABEL } from "@/lib/format";
import { disposerParColonnes } from "@/lib/disposition-horaire";

export type EvenementDetail = {
  kind: "reg" | "stage";
  id: string;
  debut: string;
  fin: string;
  debutMin: number;
  finMin: number;
  groupeNom: string;
  coachNom: string | null;
  bassin: string;
  etat?: string;
  enPause?: boolean;
  stageNom?: string;
  stageColor?: string;
  presenceHref: string;
};

export type EcheanceDetail = { id: string; titre: string; detail: string; color: string };

export type JourDetail = {
  n: number;
  dateIso: string;
  evenements: EvenementDetail[];
  echeances: EcheanceDetail[];
};

const PX_PAR_MIN = 1.7;
const PAS_MINUTES = 5;

function formatMinutes(min: number) {
  const total = Math.round(min);
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type DragInfo = { creneauId: string; origDebutMin: number; durMin: number; pointerOffsetY: number; currentDebutMin: number; colTop: number; colLeft: number; colWidth: number };

const COULEUR_VIDE = "#1E7BFF";

export function VueEnsembleClient({ mois, annee, cells, aujourdhui }: { mois: string; annee: number; cells: (JourDetail | null)[]; aujourdhui: number }) {
  const router = useRouter();
  // On garde juste la date sélectionnée (pas l'objet JourDetail) : après un
  // router.refresh() (ajout/modif d'échéance, glisser un créneau), le jour
  // rouvert reste calculé depuis les "cells" fraîches reçues du serveur au
  // lieu de figer un instantané pris au moment du clic.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = selectedDate ? cells.find((c) => c?.dateIso === selectedDate) ?? null : null;
  const [ajout, setAjout] = useState(false);
  const [form, setForm] = useState({ titre: "", detail: "", color: COULEUR_VIDE });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ titre: "", detail: "", color: COULEUR_VIDE });

  const debuts = selected ? selected.evenements.map((e) => e.debutMin) : [];
  const fins = selected ? selected.evenements.map((e) => e.finMin) : [];
  const rangeDebut = debuts.length ? Math.floor(Math.min(...debuts) / 60) * 60 : 16 * 60;
  const rangeFin = fins.length ? Math.ceil(Math.max(...fins) / 60) * 60 : 21 * 60;
  const hauteur = (rangeFin - rangeDebut) * PX_PAR_MIN;
  const heures = Array.from({ length: (rangeFin - rangeDebut) / 60 + 1 }, (_, k) => rangeDebut / 60 + k);
  const disposition = selected ? disposerParColonnes(selected.evenements) : [];

  // Glisser-déposer une carte de créneau pour changer son horaire ce
  // jour-là — même mécanique que sur le Planning hebdo (ghost flottant,
  // PATCH au relâchement uniquement si l'horaire a réellement changé),
  // réduite à un seul jour (pas de colonne à changer, juste l'heure).
  const dragRef = useRef<DragInfo | null>(null);
  const colRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragInfo | null>(null);

  function startDrag(e: React.MouseEvent, evt: EvenementDetail) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const colRect = colRef.current?.getBoundingClientRect() ?? rect;
    dragRef.current = {
      creneauId: evt.id,
      origDebutMin: evt.debutMin,
      durMin: evt.finMin - evt.debutMin,
      pointerOffsetY: e.clientY - rect.top,
      currentDebutMin: evt.debutMin,
      colTop: colRect.top,
      colLeft: colRect.left,
      colWidth: colRect.width,
    };
    setDragState(dragRef.current);
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const info = dragRef.current;
      const col = colRef.current;
      if (!info || !col) return;
      const rect = col.getBoundingClientRect();
      let newDebutMin = rangeDebut + (e.clientY - rect.top - info.pointerOffsetY) / PX_PAR_MIN;
      newDebutMin = Math.round(newDebutMin / PAS_MINUTES) * PAS_MINUTES;
      newDebutMin = Math.max(rangeDebut, Math.min(newDebutMin, rangeFin - info.durMin));
      dragRef.current = { ...info, currentDebutMin: newDebutMin, colTop: rect.top, colLeft: rect.left, colWidth: rect.width };
      setDragState(dragRef.current);
    }
    async function onUp() {
      const info = dragRef.current;
      dragRef.current = null;
      setDragState(null);
      if (!info || info.currentDebutMin === info.origDebutMin) return;
      await fetch(`/api/creneaux/${info.creneauId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debut: formatMinutes(info.currentDebutMin), fin: formatMinutes(info.currentDebutMin + info.durMin) }),
      });
      router.refresh();
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [rangeDebut, rangeFin, router]);

  const drag = dragState;

  function fermer() {
    setSelectedDate(null);
    setAjout(false);
    setEditingId(null);
  }

  function ouvrirAjout() {
    setForm({ titre: "", detail: "", color: COULEUR_VIDE });
    setAjout(true);
  }

  async function creerEcheance() {
    if (!selected || !form.titre.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/admin/echeances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selected.dateIso, ...form }),
      });
      setAjout(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function ouvrirEditionEcheance(e: EcheanceDetail) {
    setEditForm({ titre: e.titre, detail: e.detail, color: e.color });
    setEditingId(e.id);
  }

  async function enregistrerEditionEcheance() {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/echeances/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      setEditingId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function supprimerEcheance(id: string) {
    await fetch(`/api/admin/echeances/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-[19px] tracking-[0.06em]">
          {mois} {annee}
        </h2>
        <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
          Séances · échéances
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-[11px] uppercase tracking-[0.08em] mb-1.5 text-center" style={{ color: "var(--ink-tertiary)" }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => {
          const isToday = c?.n === aujourdhui;
          const badges = c ? [...c.evenements.map((e) => ({ label: e.groupeNom, color: e.kind === "stage" ? (e.stageColor ?? "#8C6BFF") : ETAT_COLOR[e.etat ?? "ASSURE"] })), ...c.echeances.map((e) => ({ label: e.titre, color: e.color }))] : [];
          return (
            <button
              key={i}
              onClick={() => c && setSelectedDate(c.dateIso)}
              disabled={!c}
              className="rounded-[9px] p-1.5 flex flex-col gap-0.5 text-left"
              style={{
                minHeight: 74,
                border: `1px solid ${isToday ? "#24C8FF" : "var(--border)"}`,
                background: isToday ? "rgba(30,123,255,0.22)" : c ? "rgba(255,255,255,0.03)" : "transparent",
                cursor: c ? "pointer" : "default",
              }}
            >
              {c && (
                <>
                  <span className="text-xs font-semibold" style={{ color: isToday ? "var(--ink)" : "var(--ink-body)" }}>
                    {c.n}
                  </span>
                  {badges.slice(0, 3).map((e, j) => (
                    <span
                      key={j}
                      className="text-[9px] font-bold leading-tight px-1 py-0.5 rounded whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ background: "rgba(255,255,255,0.08)", color: e.color }}
                    >
                      {e.label}
                    </span>
                  ))}
                </>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div onClick={fermer} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 520, maxHeight: "88vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[19px] tracking-[0.05em]">
                {selected.n} {mois}
              </h2>
              <button onClick={fermer} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto flex flex-col gap-3">
              <div className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: "var(--ink-tertiary)" }}>
                Échéances
              </div>
              {selected.echeances.map((e) =>
                editingId === e.id ? (
                  <div key={e.id} className="flex flex-col gap-2 rounded-lg px-3 py-2.5" style={{ background: "rgba(30,123,255,0.1)", border: "1px solid var(--border-strong)" }}>
                    <input
                      value={editForm.titre}
                      onChange={(ev) => setEditForm((f) => ({ ...f, titre: ev.target.value }))}
                      placeholder="Titre"
                      className="rounded-[9px] px-3 py-2 text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                    />
                    <div className="flex gap-2">
                      <input
                        value={editForm.detail}
                        onChange={(ev) => setEditForm((f) => ({ ...f, detail: ev.target.value }))}
                        placeholder="Détail"
                        className="flex-1 rounded-[9px] px-3 py-2 text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                      />
                      <input type="color" value={editForm.color} onChange={(ev) => setEditForm((f) => ({ ...f, color: ev.target.value }))} className="rounded-[9px] w-[42px] cursor-pointer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-strong)" }} />
                    </div>
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
                        Annuler
                      </button>
                      <button onClick={enregistrerEditionEcheance} disabled={saving} className="rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
                        {saving ? "…" : "OK"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={e.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderLeft: `3px solid ${e.color}` }}>
                    <span className="text-sm font-semibold flex-1">{e.titre}</span>
                    {e.detail && (
                      <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                        {e.detail}
                      </span>
                    )}
                    <button onClick={() => ouvrirEditionEcheance(e)} className="text-xs font-semibold cursor-pointer" style={{ color: "var(--cyan)" }}>
                      Modifier
                    </button>
                    <button onClick={() => supprimerEcheance(e.id)} className="text-xs font-semibold cursor-pointer" style={{ color: "var(--ink-secondary)" }}>
                      Supprimer
                    </button>
                  </div>
                )
              )}
              {selected.echeances.length === 0 && !ajout && (
                <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Aucune échéance ce jour-là.
                </div>
              )}

              {ajout ? (
                <div className="flex flex-col gap-2 rounded-lg px-3 py-2.5" style={{ background: "rgba(30,123,255,0.08)", border: "1px dashed rgba(30,123,255,0.4)" }}>
                  <input
                    autoFocus
                    value={form.titre}
                    onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
                    placeholder="Titre (ex. Compétition Thiers)"
                    className="rounded-[9px] px-3 py-2 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                  <div className="flex gap-2">
                    <input
                      value={form.detail}
                      onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
                      placeholder="Détail (facultatif)"
                      className="flex-1 rounded-[9px] px-3 py-2 text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                    />
                    <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="rounded-[9px] w-[42px] cursor-pointer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-strong)" }} />
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={() => setAjout(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
                      Annuler
                    </button>
                    <button onClick={creerEcheance} disabled={saving || !form.titre.trim()} className="rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
                      {saving ? "…" : "Ajouter"}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={ouvrirAjout} className="self-start text-[13px] font-semibold cursor-pointer" style={{ color: "#7FDCFF" }}>
                  + Ajouter une échéance ce jour
                </button>
              )}

              <div className="text-[11px] font-bold tracking-[0.1em] uppercase mt-2" style={{ color: "var(--ink-tertiary)" }}>
                Séances
              </div>
              {selected.evenements.length === 0 ? (
                <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  Aucun créneau ce jour-là.
                </div>
              ) : (
                <div ref={colRef} className="relative rounded-[11px]" style={{ height: hauteur, background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                  {heures.map((h) => (
                    <div key={h} className="absolute left-0 right-0 flex items-center gap-2" style={{ top: (h * 60 - rangeDebut) * PX_PAR_MIN }}>
                      <span className="text-[10px] pl-1.5 shrink-0" style={{ color: "var(--ink-tertiary)", width: 34 }}>
                        {String(Math.floor(h) % 24).padStart(2, "0")}:00
                      </span>
                      <div className="flex-1" style={{ borderTop: "1px solid var(--border)", opacity: 0.6 }} />
                    </div>
                  ))}
                  {disposition.map((e) => {
                    const enCoursDeGlisse = drag?.creneauId === e.id;
                    const top = enCoursDeGlisse && drag ? (drag.currentDebutMin - rangeDebut) * PX_PAR_MIN : (e.debutMin - rangeDebut) * PX_PAR_MIN;
                    const h = Math.max((e.finMin - e.debutMin) * PX_PAR_MIN, 40);
                    const largeurPct = 100 / e.nbCols;
                    const compact = h < 70;
                    const couleur = e.kind === "stage" ? (e.stageColor ?? "#8C6BFF") : ETAT_COLOR[e.etat ?? "ASSURE"];
                    return (
                      <div
                        key={e.id}
                        onMouseDown={e.kind === "reg" ? (ev) => startDrag(ev, e) : undefined}
                        onClick={() => !enCoursDeGlisse && router.push(e.presenceHref)}
                        className="absolute rounded-[8px] px-2 py-1.5 overflow-hidden transition-colors hover:brightness-110"
                        style={{
                          top,
                          height: h,
                          left: `calc(38px + ${e.col * largeurPct}%)`,
                          width: `calc(${largeurPct}% - 42px)`,
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderLeft: `3px solid ${couleur}`,
                          opacity: enCoursDeGlisse ? 0.4 : e.enPause ? 0.5 : 1,
                          cursor: e.kind === "reg" ? "grab" : "pointer",
                        }}
                        title={`${e.groupeNom} · ${e.debut}–${e.fin} · ${e.coachNom ?? "—"}${e.kind === "reg" ? " · glisser pour changer l'horaire" : ""}`}
                      >
                        <div className="text-[12px] font-semibold truncate leading-tight">{e.groupeNom}</div>
                        <div className="text-[10px] truncate" style={{ color: "#7D91AE" }}>
                          {enCoursDeGlisse && drag ? `${formatMinutes(drag.currentDebutMin)}–${formatMinutes(drag.currentDebutMin + drag.durMin)}` : `${e.debut}–${e.fin}`}
                          {!compact && ` · ${e.coachNom ?? "—"}`}
                        </div>
                        {!compact && e.kind === "reg" && (
                          <div className="text-[9px] font-bold mt-0.5" style={{ color: couleur }}>
                            {e.enPause ? "En pause" : ETAT_LABEL[e.etat ?? "ASSURE"]}
                          </div>
                        )}
                        {!compact && e.kind === "stage" && (
                          <div className="text-[9px] font-bold mt-0.5 truncate" style={{ color: couleur }}>
                            Stage · {e.stageNom}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
