"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ETAT_COLOR, ETAT_LABEL, JOURS } from "@/lib/format";
import { couleurObjectif } from "@/lib/objectifs";
import { parseHeureMin, disposerParColonnes } from "@/lib/disposition-horaire";
import { ViewToggle } from "./ViewToggle";

type Creneau = {
  id: string;
  jour: number;
  debut: string;
  fin: string;
  bassin: string;
  etat: string;
  effectifLabel: string | null;
  groupeId: string;
  groupe: { nom: string; objectif: string | null };
  coach: { user: { name: string } } | null;
  libelleCoach: string | null;
  actifHorsVacances: boolean;
  effectifNageurs: { nageurId: string }[];
};

type Option = { id: string; nom: string };
type NageurOption = { id: string; nom: string; groupeId: string | null };

type StageCreneauJour = { id: string; debut: string; fin: string; groupe: string; coachNom: string | null; bassin: string; theme: string };
type StageJourEntry = { stageId: string; stageNom: string; color: string; creneaux: StageCreneauJour[] };

type EvenementJour =
  | { kind: "reg"; id: string; debutMin: number; finMin: number; creneau: Creneau }
  | { kind: "stage"; id: string; debutMin: number; finMin: number; creneau: StageCreneauJour; stageNom: string; stageColor: string };

const PX_PAR_MIN = 1.5;
const PAS_MINUTES = 5;

function formatMinutes(min: number) {
  const total = Math.round(min);
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type DragInfo = {
  creneauId: string;
  groupeNom: string;
  etat: string;
  origJour: number;
  origDebutMin: number;
  durMin: number;
  pointerOffsetY: number;
  currentJour: number;
  currentDebutMin: number;
  colLeft: number;
  colTop: number;
  colWidth: number;
};

export function PlanningClient({
  creneaux,
  dayLabels,
  dayDates,
  weekLabel,
  weekOffset,
  groupes,
  coachs,
  nageurs,
  canEdit,
  showVueToggle = false,
  defaultCoachId = "",
  periodeVacances = null,
  stagesByDay = {},
  echeancesByDay = {},
}: {
  creneaux: Creneau[];
  dayLabels: string[];
  dayDates: string[];
  weekLabel: string;
  weekOffset: number;
  groupes: Option[];
  coachs: Option[];
  nageurs: NageurOption[];
  canEdit: boolean;
  showVueToggle?: boolean;
  defaultCoachId?: string;
  periodeVacances?: { nom: string; zone: string } | null;
  stagesByDay?: Record<number, StageJourEntry[]>;
  echeancesByDay?: Record<number, { titre: string; detail: string; color: string }[]>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vue = searchParams.get("vue") === "moi" ? "moi" : "globale";
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ jour: 0, debut: "18:00", fin: "19:30", groupeId: groupes[0]?.id ?? "", coachId: defaultCoachId, bassin: "Bassin 50 m", etat: "ASSURE" });
  const [saving, setSaving] = useState(false);

  const [absModalOpen, setAbsModalOpen] = useState(false);
  const [absForm, setAbsForm] = useState({ qui: "nageur" as "nageur" | "coach", personneId: nageurs[0]?.id ?? "", date: "", motif: "" });
  const [absSaving, setAbsSaving] = useState(false);

  function pushWeek(offset: number) {
    const params = new URLSearchParams(searchParams);
    params.set("week", String(offset));
    router.push(`?${params.toString()}`);
  }

  function openModal(jour: number) {
    setForm((f) => ({ ...f, jour }));
    setModalOpen(true);
  }

  function setQui(qui: "nageur" | "coach") {
    setAbsForm((f) => ({ ...f, qui, personneId: (qui === "nageur" ? nageurs[0]?.id : coachs[0]?.id) ?? "" }));
  }

  async function declarerAbsence() {
    if (!absForm.personneId || !absForm.date) return;
    setAbsSaving(true);
    try {
      await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(absForm),
      });
      setAbsModalOpen(false);
      router.push("/absences");
    } finally {
      setAbsSaving(false);
    }
  }

  async function submit() {
    setSaving(true);
    try {
      await fetch("/api/creneaux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, coachId: form.coachId || null }),
      });
      setModalOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/creneaux/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const [effectifCreneau, setEffectifCreneau] = useState<Creneau | null>(null);
  const [toutLeGroupe, setToutLeGroupe] = useState(true);
  const [effectifSelected, setEffectifSelected] = useState<Set<string>>(new Set());
  const [pauseVacances, setPauseVacances] = useState(true);
  const [savingEffectif, setSavingEffectif] = useState(false);

  function openReglages(c: Creneau) {
    const membresGroupe = nageurs.filter((n) => n.groupeId === c.groupeId);
    if (c.effectifNageurs.length > 0) {
      setToutLeGroupe(false);
      setEffectifSelected(new Set(c.effectifNageurs.map((e) => e.nageurId)));
    } else {
      setToutLeGroupe(true);
      setEffectifSelected(new Set(membresGroupe.map((n) => n.id)));
    }
    setPauseVacances(c.actifHorsVacances);
    setEffectifCreneau(c);
  }

  function toggleEffectifNageur(id: string) {
    setEffectifSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveReglages() {
    if (!effectifCreneau) return;
    setSavingEffectif(true);
    try {
      await fetch(`/api/creneaux/${effectifCreneau.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nageurIds: toutLeGroupe ? null : Array.from(effectifSelected), actifHorsVacances: pauseVacances }),
      });
      setEffectifCreneau(null);
      router.refresh();
    } finally {
      setSavingEffectif(false);
    }
  }

  const byDay = JOURS.map((_, i) => creneaux.filter((c) => c.jour === i).sort((a, b) => a.debut.localeCompare(b.debut)));

  const evenementsParJour: EvenementJour[][] = JOURS.map((_, i) => [
    ...byDay[i].map((c) => ({ kind: "reg" as const, id: c.id, debutMin: parseHeureMin(c.debut), finMin: parseHeureMin(c.fin), creneau: c })),
    ...(stagesByDay[i] ?? []).flatMap((entry) =>
      entry.creneaux.map((c) => ({ kind: "stage" as const, id: c.id, debutMin: parseHeureMin(c.debut), finMin: parseHeureMin(c.fin), creneau: c, stageNom: entry.stageNom, stageColor: entry.color }))
    ),
  ]);
  const tousDebuts = evenementsParJour.flat().map((e) => e.debutMin);
  const tousFins = evenementsParJour.flat().map((e) => e.finMin);
  // Échelle horaire ajustée aux créneaux réels de la semaine (avec un
  // repli sur une plage type "fin de journée" si la semaine est vide),
  // plutôt qu'une plage fixe qui gâcherait de la hauteur pour rien.
  const rangeDebut = tousDebuts.length ? Math.floor(Math.min(...tousDebuts) / 60) * 60 : 16 * 60;
  const rangeFin = tousFins.length ? Math.ceil(Math.max(...tousFins) / 60) * 60 : 21 * 60;
  const hauteurGrille = (rangeFin - rangeDebut) * PX_PAR_MIN;
  const heures = Array.from({ length: (rangeFin - rangeDebut) / 60 + 1 }, (_, k) => rangeDebut / 60 + k);
  const dispositionParJour = evenementsParJour.map((evts) => disposerParColonnes(evts));

  // Glisser-déposer un créneau sur un autre jour/horaire : dragRef porte
  // l'état vivant (lu/écrit à chaque mousemove sans relancer l'effet), un
  // "ghost" flottant suit le curseur pendant le geste — le PATCH ne part
  // qu'au relâchement, et seulement si jour ou horaire a réellement changé.
  const dragRef = useRef<DragInfo | null>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dragState, setDragState] = useState<DragInfo | null>(null);

  function startDrag(e: React.MouseEvent, c: Creneau) {
    if (!canEdit) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const colRect = colRefs.current[c.jour]?.getBoundingClientRect() ?? rect;
    const debutMin = parseHeureMin(c.debut);
    const finMin = parseHeureMin(c.fin);
    dragRef.current = {
      creneauId: c.id,
      groupeNom: c.groupe.nom,
      etat: c.etat,
      origJour: c.jour,
      origDebutMin: debutMin,
      durMin: finMin - debutMin,
      pointerOffsetY: e.clientY - rect.top,
      currentJour: c.jour,
      currentDebutMin: debutMin,
      colLeft: colRect.left,
      colTop: colRect.top,
      colWidth: colRect.width,
    };
    setDragState(dragRef.current);
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const info = dragRef.current;
      if (!info) return;
      let overCol = -1;
      let overRect: { left: number; top: number; width: number } | null = null;
      for (let i = 0; i < colRefs.current.length; i++) {
        const el = colRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX < r.right) {
          overCol = i;
          overRect = r;
          break;
        }
      }
      if (overCol === -1 || !overRect) return;
      let newDebutMin = rangeDebut + (e.clientY - overRect.top - info.pointerOffsetY) / PX_PAR_MIN;
      newDebutMin = Math.round(newDebutMin / PAS_MINUTES) * PAS_MINUTES;
      newDebutMin = Math.max(rangeDebut, Math.min(newDebutMin, rangeFin - info.durMin));
      dragRef.current = { ...info, currentJour: overCol, currentDebutMin: newDebutMin, colLeft: overRect.left, colTop: overRect.top, colWidth: overRect.width };
      setDragState(dragRef.current);
    }

    async function onUp() {
      const info = dragRef.current;
      dragRef.current = null;
      setDragState(dragRef.current);
      if (!info) return;
      if (info.currentJour === info.origJour && info.currentDebutMin === info.origDebutMin) return;
      await fetch(`/api/creneaux/${info.creneauId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jour: info.currentJour, debut: formatMinutes(info.currentDebutMin), fin: formatMinutes(info.currentDebutMin + info.durMin) }),
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        {showVueToggle && (
          <ViewToggle
            options={[
              { value: "globale", label: "Vue globale" },
              { value: "moi", label: "Mon planning" },
            ]}
            current={vue}
          />
        )}
        <div className="flex items-center gap-1.5 rounded-[10px] p-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }}>
          <button onClick={() => pushWeek(weekOffset - 1)} className="px-2.5 py-1 text-[15px] cursor-pointer">
            ‹
          </button>
          <span className="text-[13px] font-semibold tracking-[0.04em]">{weekLabel}</span>
          <button onClick={() => pushWeek(weekOffset + 1)} className="px-2.5 py-1 text-[15px] cursor-pointer">
            ›
          </button>
        </div>
        <div className="flex gap-3.5 flex-wrap flex-1">
          {["ASSURE", "REMPLACE", "A_COUVRIR"].map((e) => (
            <div key={e} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-body)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: ETAT_COLOR[e] }} />
              {ETAT_LABEL[e]}
            </div>
          ))}
        </div>
        <button
          onClick={() => setAbsModalOpen(true)}
          className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
          style={{ border: "1px solid rgba(232,68,43,0.35)", background: "rgba(232,68,43,0.12)", color: "#FF9179" }}
        >
          − Déclarer une absence
        </button>
        {canEdit && (
          <button
            onClick={() => openModal(0)}
            className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
            style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}
          >
            + Ajouter un créneau
          </button>
        )}
      </div>

      {periodeVacances && (
        <div className="rounded-[11px] px-4 py-3 text-[13px]" style={{ background: "rgba(242,179,61,0.1)", border: "1px solid rgba(242,179,61,0.35)", color: "#F2B33D" }}>
          🏖 {periodeVacances.nom} (zone {periodeVacances.zone}) — les créneaux réguliers marqués « hors vacances » sont en pause cette semaine ; les stages prévus sont affichés ci-dessous.
        </div>
      )}

      <div className="overflow-x-auto pb-1.5">
        <div className="grid gap-3" style={{ gridTemplateColumns: "44px repeat(7,minmax(178px,1fr))", minWidth: 1224 }}>
          <div className="flex flex-col gap-2.5">
            <div style={{ height: 60 }} />
            <div style={{ position: "relative", height: hauteurGrille }}>
              {heures.map((h) => (
                <div
                  key={h}
                  className="absolute right-1 text-[10px] text-right"
                  style={{ top: (h * 60 - rangeDebut) * PX_PAR_MIN - 6, color: "#61789B" }}
                >
                  {String(Math.floor(h) % 24).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {JOURS.map((nom, i) => (
            <div key={nom} className="flex flex-col gap-2.5">
              <div className="text-center rounded-[11px] p-2.5 flex flex-col justify-center gap-1" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", minHeight: 60, boxSizing: "border-box" }}>
                <div className="font-display text-[15px] tracking-[0.12em] uppercase">{nom}</div>
                <div className="text-[11px]" style={{ color: "var(--ink-secondary)" }}>
                  {dayLabels[i]}
                </div>
                {(echeancesByDay[i] ?? []).map((e, j) => (
                  <div
                    key={j}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded truncate"
                    style={{ background: `${e.color}26`, color: e.color }}
                    title={`${e.titre}${e.detail ? " — " + e.detail : ""}`}
                  >
                    {e.titre}
                  </div>
                ))}
              </div>

              <div ref={(el) => { colRefs.current[i] = el; }} className="rounded-[11px] relative" style={{ height: hauteurGrille, background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                {heures.map((h) => (
                  <div key={h} className="absolute left-0 right-0" style={{ top: (h * 60 - rangeDebut) * PX_PAR_MIN, borderTop: "1px solid var(--border)", opacity: 0.6 }} />
                ))}

                {dispositionParJour[i].map((e) => {
                  const top = (e.debutMin - rangeDebut) * PX_PAR_MIN;
                  const hauteur = Math.max((e.finMin - e.debutMin) * PX_PAR_MIN, 46);
                  const largeurPct = 100 / e.nbCols;
                  const comparteCompact = hauteur < 90;

                  if (e.kind === "stage") {
                    const c = e.creneau;
                    return (
                      <div
                        key={e.id}
                        onClick={() => router.push(`/presences?slot=stage:${c.id}&date=${dayDates[i]}`)}
                        className="absolute rounded-[9px] px-2.5 py-2 cursor-pointer overflow-hidden transition-colors hover:brightness-110"
                        style={{
                          top,
                          height: hauteur,
                          left: `${e.col * largeurPct}%`,
                          width: `calc(${largeurPct}% - 4px)`,
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderLeft: `3px solid ${e.stageColor}`,
                        }}
                        title={`Stage · ${e.stageNom} · ${c.groupe} · ${c.debut}–${c.fin} · ${c.coachNom ?? "—"}`}
                      >
                        <div className="text-[9px] font-bold tracking-[0.08em] uppercase truncate" style={{ color: e.stageColor }}>
                          Stage · {e.stageNom}
                        </div>
                        <div className="text-[13px] font-semibold truncate leading-tight">{c.groupe}</div>
                        <div className="text-[11px] truncate" style={{ color: "#7D91AE" }}>
                          {c.debut}–{c.fin} {!comparteCompact && `· ${c.coachNom ?? "—"}`}
                        </div>
                      </div>
                    );
                  }

                  const c = e.creneau;
                  const enPause = Boolean(periodeVacances && c.actifHorsVacances);
                  const enCoursDeGlisse = drag?.creneauId === c.id;
                  return (
                    <div
                      key={e.id}
                      onMouseDown={(ev) => startDrag(ev, c)}
                      onClick={() => !enCoursDeGlisse && router.push(`/presences?slot=reg:${c.id}&date=${dayDates[i]}`)}
                      className="absolute rounded-[9px] px-2.5 py-2 group overflow-hidden transition-colors hover:brightness-110"
                      style={{
                        top,
                        height: hauteur,
                        left: `${e.col * largeurPct}%`,
                        width: `calc(${largeurPct}% - 4px)`,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderLeft: `3px solid ${ETAT_COLOR[c.etat]}`,
                        opacity: enCoursDeGlisse ? 0.25 : enPause ? 0.5 : 1,
                        cursor: canEdit ? "grab" : "pointer",
                      }}
                      title={`${c.groupe.nom} · ${enPause ? "En pause" : ETAT_LABEL[c.etat]} · ${c.debut}–${c.fin} · ${c.libelleCoach ?? c.coach?.user.name ?? "—"} · ${c.bassin}${canEdit ? " · glisser pour déplacer" : ""}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: ETAT_COLOR[c.etat] }} />
                        <span className="text-[13px] font-semibold truncate leading-tight">{c.groupe.nom}</span>
                        {canEdit && (
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              remove(c.id);
                            }}
                            className="ml-auto text-[11px] cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
                            style={{ color: "var(--ink-muted)" }}
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: "#7D91AE" }}>
                        {c.debut}–{c.fin} · {c.libelleCoach ?? c.coach?.user.name ?? "—"}
                      </div>
                      {!comparteCompact && c.groupe.objectif && (
                        <span
                          className="inline-block mt-1 text-[9px] font-bold px-1 py-0.5 rounded truncate max-w-full"
                          style={{ background: `${couleurObjectif(c.groupe.objectif)}26`, color: couleurObjectif(c.groupe.objectif) }}
                        >
                          {c.groupe.objectif}
                        </span>
                      )}
                      {!comparteCompact && canEdit && (
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            openReglages(c);
                          }}
                          className="absolute bottom-1 right-1.5 text-[10px] cursor-pointer opacity-0 group-hover:opacity-100"
                          style={{ color: "var(--ink-muted)" }}
                          title="Réglages : effectif attendu et comportement pendant les vacances scolaires"
                        >
                          ⚙
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {canEdit && (
                <button
                  onClick={() => openModal(i)}
                  className="rounded-[11px] p-3 text-xs cursor-pointer"
                  style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-muted)" }}
                >
                  + créneau
                </button>
              )}
              {evenementsParJour[i].length === 0 && !canEdit && (
                <div className="rounded-[11px] p-5 text-center text-[13px]" style={{ border: "1px dashed var(--border)", color: "var(--ink-muted)" }}>
                  —
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {drag && (
        <div
          className="fixed rounded-[9px] px-2.5 py-2 overflow-hidden pointer-events-none"
          style={{
            zIndex: 200,
            left: drag.colLeft,
            width: drag.colWidth,
            top: drag.colTop + (drag.currentDebutMin - rangeDebut) * PX_PAR_MIN,
            height: Math.max(drag.durMin * PX_PAR_MIN, 46),
            background: "var(--bg-card)",
            border: `2px solid ${ETAT_COLOR[drag.etat]}`,
            boxShadow: "0 10px 28px rgba(0,0,0,0.55)",
          }}
        >
          <div className="text-[13px] font-semibold truncate leading-tight">{drag.groupeNom}</div>
          <div className="text-[11px]" style={{ color: "#7D91AE" }}>
            {JOURS[drag.currentJour]} {formatMinutes(drag.currentDebutMin)}–{formatMinutes(drag.currentDebutMin + drag.durMin)}
          </div>
        </div>
      )}

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-y-auto" style={{ maxWidth: 560, maxHeight: "88vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">Nouveau créneau</h2>
              <button onClick={() => setModalOpen(false)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Jour
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {JOURS.map((j, i) => (
                    <button
                      key={j}
                      onClick={() => setForm((f) => ({ ...f, jour: i }))}
                      className="rounded-[10px] px-3.5 py-2 text-xs font-bold cursor-pointer"
                      style={{ border: `1px solid ${form.jour === i ? "#1E7BFF" : "var(--border-strong)"}`, background: form.jour === i ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)" }}
                    >
                      {j}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Début
                  </div>
                  <input type="time" value={form.debut} onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Fin
                  </div>
                  <input type="time" value={form.fin} onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Groupe
                </div>
                <select value={form.groupeId} onChange={(e) => setForm((f) => ({ ...f, groupeId: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                  {groupes.map((g) => (
                    <option key={g.id} value={g.id} style={{ background: "#101A2B" }}>
                      {g.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Coach
                  </div>
                  <select value={form.coachId} onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                    <option value="" style={{ background: "#101A2B" }}>
                      —
                    </option>
                    {coachs.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: "#101A2B" }}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Bassin
                  </div>
                  <input value={form.bassin} onChange={(e) => setForm((f) => ({ ...f, bassin: e.target.value }))} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
                </div>
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  État d&apos;encadrement
                </div>
                <div className="flex gap-1.5">
                  {["ASSURE", "REMPLACE", "A_COUVRIR"].map((e) => (
                    <button
                      key={e}
                      onClick={() => setForm((f) => ({ ...f, etat: e }))}
                      className="rounded-[9px] px-3.5 py-2 text-xs font-bold cursor-pointer"
                      style={{ border: `1px solid ${form.etat === e ? ETAT_COLOR[e] : "var(--border-strong)"}`, color: form.etat === e ? ETAT_COLOR[e] : "var(--ink-body)" }}
                    >
                      {ETAT_LABEL[e]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end">
              <button onClick={() => setModalOpen(false)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button onClick={submit} disabled={saving} className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Ajout…" : "Ajouter au planning"}
              </button>
            </div>
          </div>
        </div>
      )}

      {absModalOpen && (
        <div onClick={() => setAbsModalOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl" style={{ maxWidth: 480, background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">Déclarer une absence</h2>
              <button onClick={() => setAbsModalOpen(false)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3.5">
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Qui
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(["nageur", "coach"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQui(q)}
                      className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer"
                      style={{
                        border: `1px solid ${absForm.qui === q ? "#1E7BFF" : "var(--border-strong)"}`,
                        background: absForm.qui === q ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)",
                        color: absForm.qui === q ? "var(--ink)" : "var(--ink-body)",
                      }}
                    >
                      {q === "nageur" ? "Nageur" : "Coach"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  {absForm.qui === "coach" ? "Coach" : "Nageur"}
                </div>
                <select
                  value={absForm.personneId}
                  onChange={(e) => setAbsForm((f) => ({ ...f, personneId: e.target.value }))}
                  className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                >
                  {(absForm.qui === "coach" ? coachs : nageurs).map((p) => (
                    <option key={p.id} value={p.id} style={{ background: "#101A2B" }}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Date
                  </div>
                  <input
                    type="date"
                    value={absForm.date}
                    onChange={(e) => setAbsForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Motif
                  </div>
                  <input
                    value={absForm.motif}
                    onChange={(e) => setAbsForm((f) => ({ ...f, motif: e.target.value }))}
                    placeholder="Maladie, scolaire…"
                    className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end">
              <button onClick={() => setAbsModalOpen(false)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button
                onClick={declarerAbsence}
                disabled={absSaving}
                className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#E8442B,#B92E19)", color: "#fff", opacity: absSaving ? 0.7 : 1 }}
              >
                {absSaving ? "Envoi…" : "Déclarer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {effectifCreneau && (
        <div onClick={() => setEffectifCreneau(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 480, maxHeight: "82vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <div>
                <h2 className="font-display text-[22px] tracking-[0.05em]">Réglages — {effectifCreneau.groupe.nom}</h2>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                  {JOURS[effectifCreneau.jour]} {effectifCreneau.debut}–{effectifCreneau.fin}
                </div>
              </div>
              <button onClick={() => setEffectifCreneau(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 pt-4">
              <label className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <input type="checkbox" checked={!pauseVacances} onChange={(e) => setPauseVacances(!e.target.checked)} className="w-4 h-4 cursor-pointer" />
                <span className="flex-1 text-sm">Continue pendant les vacances scolaires</span>
              </label>
              <div className="text-[11px] mt-1.5 mb-1" style={{ color: "var(--ink-muted)" }}>
                Par défaut, ce créneau se met en pause automatiquement pendant les vacances (les stages
                prennent le relais). Coche pour qu&apos;il continue toute l&apos;année.
              </div>
            </div>
            <div className="px-6 pt-3 flex gap-1.5">
              <div className="text-[11px] tracking-[0.12em] uppercase w-full mb-0.5" style={{ color: "#61789B" }}>
                Effectif attendu
              </div>
            </div>
            <div className="px-6 flex gap-1.5">
              <button
                onClick={() => setToutLeGroupe(true)}
                className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer"
                style={{ border: `1px solid ${toutLeGroupe ? "#1E7BFF" : "var(--border-strong)"}`, background: toutLeGroupe ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)", color: toutLeGroupe ? "var(--ink)" : "var(--ink-body)" }}
              >
                Tout le groupe
              </button>
              <button
                onClick={() => setToutLeGroupe(false)}
                className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer"
                style={{ border: `1px solid ${!toutLeGroupe ? "#1E7BFF" : "var(--border-strong)"}`, background: !toutLeGroupe ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)", color: !toutLeGroupe ? "var(--ink)" : "var(--ink-body)" }}
              >
                Sélection personnalisée
              </button>
            </div>
            {!toutLeGroupe && (
              <div className="px-6 py-4 flex-1 overflow-y-auto flex flex-col gap-1.5">
                {nageurs
                  .filter((n) => n.groupeId === effectifCreneau.groupeId)
                  .map((n) => (
                    <label key={n.id} className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer" style={{ background: effectifSelected.has(n.id) ? "rgba(30,123,255,0.12)" : "transparent" }}>
                      <input type="checkbox" checked={effectifSelected.has(n.id)} onChange={() => toggleEffectifNageur(n.id)} className="w-4 h-4 cursor-pointer" />
                      <span className="flex-1 text-sm">{n.nom}</span>
                    </label>
                  ))}
                {nageurs.filter((n) => n.groupeId === effectifCreneau.groupeId).length === 0 && (
                  <div className="text-[13px] text-center py-6" style={{ color: "var(--ink-secondary)" }}>
                    Aucun nageur dans ce groupe.
                  </div>
                )}
              </div>
            )}
            <div className="px-6 pb-5 pt-4 flex gap-2.5 justify-end" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setEffectifCreneau(null)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button
                onClick={saveReglages}
                disabled={savingEffectif}
                className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: savingEffectif ? 0.7 : 1 }}
              >
                {savingEffectif ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
