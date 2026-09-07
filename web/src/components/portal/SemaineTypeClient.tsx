"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ETAT_COLOR, ETAT_LABEL, CATEGORIE_EVENEMENT_COLOR, CATEGORIE_EVENEMENT_LABEL, JOURS } from "@/lib/format";

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
  coachId: string | null;
  coach: { user: { name: string } } | null;
  libelleCoach: string | null;
  actifHorsVacances: boolean;
  effectifNageurs: { nageurId: string }[];
};

type CategorieEvenement = "REUNION" | "FORUM" | "AUTRE";

type Evenement = {
  id: string;
  jour: number;
  debut: string;
  fin: string;
  categorie: CategorieEvenement;
  titre: string;
  lieu: string | null;
  coachId: string | null;
  coach: { user: { name: string } } | null;
};

type EcheanceLite = { id: string; titre: string; detail: string; color: string; date: string; jour: number };

type Option = { id: string; nom: string };
type NageurOption = { id: string; nom: string; groupeId: string | null };

type ItemType = "ENTRAINEMENT" | CategorieEvenement;

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "ENTRAINEMENT", label: "Entraînement" },
  { value: "REUNION", label: "Réunion" },
  { value: "FORUM", label: "Forum" },
  { value: "AUTRE", label: "Autre" },
];

function colorFor(itemType: ItemType, etat: string) {
  return itemType === "ENTRAINEMENT" ? ETAT_COLOR[etat] : CATEGORIE_EVENEMENT_COLOR[itemType];
}

export function SemaineTypeClient({
  creneaux,
  groupes,
  coachs,
  nageurs,
  evenements,
  prochainesEcheances,
}: {
  creneaux: Creneau[];
  groupes: Option[];
  coachs: Option[];
  nageurs: NageurOption[];
  evenements: Evenement[];
  prochainesEcheances: EcheanceLite[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{ type: "CRENEAU" | "EVENEMENT"; id: string } | null>(null);
  const [form, setForm] = useState({
    itemType: "ENTRAINEMENT" as ItemType,
    jour: 0,
    debut: "18:00",
    fin: "19:30",
    groupeId: groupes[0]?.id ?? "",
    coachId: "",
    bassin: "Bassin 50 m",
    etat: "ASSURE",
    titre: "",
    lieu: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [detailEcheance, setDetailEcheance] = useState<EcheanceLite | null>(null);

  const [effectifCreneau, setEffectifCreneau] = useState<Creneau | null>(null);
  const [toutLeGroupe, setToutLeGroupe] = useState(true);
  const [effectifSelected, setEffectifSelected] = useState<Set<string>>(new Set());
  const [savingEffectif, setSavingEffectif] = useState(false);

  function openModal(jour: number) {
    setEditing(null);
    setForm({
      itemType: "ENTRAINEMENT",
      jour,
      debut: "18:00",
      fin: "19:30",
      groupeId: groupes[0]?.id ?? "",
      coachId: "",
      bassin: "Bassin 50 m",
      etat: "ASSURE",
      titre: "",
      lieu: "",
    });
    setModalOpen(true);
  }

  function openEditCreneau(c: Creneau) {
    setEditing({ type: "CRENEAU", id: c.id });
    setForm({
      itemType: "ENTRAINEMENT",
      jour: c.jour,
      debut: c.debut,
      fin: c.fin,
      groupeId: c.groupeId,
      coachId: c.coachId ?? "",
      bassin: c.bassin,
      etat: c.etat,
      titre: "",
      lieu: "",
    });
    setModalOpen(true);
  }

  function openEditEvenement(e: Evenement) {
    setEditing({ type: "EVENEMENT", id: e.id });
    setForm({
      itemType: e.categorie,
      jour: e.jour,
      debut: e.debut,
      fin: e.fin,
      groupeId: groupes[0]?.id ?? "",
      coachId: e.coachId ?? "",
      bassin: "Bassin 50 m",
      etat: "ASSURE",
      titre: e.titre,
      lieu: e.lieu ?? "",
    });
    setModalOpen(true);
  }

  const formIncomplet = form.itemType === "ENTRAINEMENT" ? !form.groupeId : !form.titre.trim();

  async function submit() {
    setSaving(true);
    try {
      if (form.itemType === "ENTRAINEMENT") {
        const payload = { jour: form.jour, debut: form.debut, fin: form.fin, groupeId: form.groupeId, coachId: form.coachId || null, bassin: form.bassin, etat: form.etat };
        if (editing?.type === "CRENEAU") {
          await fetch(`/api/creneaux/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        } else {
          await fetch("/api/creneaux", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        }
      } else {
        const payload = { jour: form.jour, debut: form.debut, fin: form.fin, categorie: form.itemType, titre: form.titre.trim(), lieu: form.lieu.trim() || null, coachId: form.coachId || null };
        if (editing?.type === "EVENEMENT") {
          await fetch(`/api/evenements-semaine/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        } else {
          await fetch("/api/evenements-semaine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        }
      }
      setModalOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function removeEditing() {
    if (!editing) return;
    setDeleting(true);
    try {
      if (editing.type === "CRENEAU") {
        await fetch(`/api/creneaux/${editing.id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/evenements-semaine/${editing.id}`, { method: "DELETE" });
      }
      setModalOpen(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  async function moveToDay(id: string, jour: number) {
    await fetch(`/api/creneaux/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jour }),
    });
    router.refresh();
  }

  function onDrop(e: React.DragEvent, jourCible: number) {
    e.preventDefault();
    setDragOverDay(null);
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    setDraggedId(null);
    if (!id) return;
    const c = creneaux.find((cr) => cr.id === id);
    if (!c || c.jour === jourCible) return;
    moveToDay(id, jourCible);
  }

  function openEffectif(c: Creneau) {
    const membresGroupe = nageurs.filter((n) => n.groupeId === c.groupeId);
    if (c.effectifNageurs.length > 0) {
      setToutLeGroupe(false);
      setEffectifSelected(new Set(c.effectifNageurs.map((e) => e.nageurId)));
    } else {
      setToutLeGroupe(true);
      setEffectifSelected(new Set(membresGroupe.map((n) => n.id)));
    }
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

  async function saveEffectif() {
    if (!effectifCreneau) return;
    setSavingEffectif(true);
    try {
      await fetch(`/api/creneaux/${effectifCreneau.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nageurIds: toutLeGroupe ? null : Array.from(effectifSelected) }),
      });
      setEffectifCreneau(null);
      router.refresh();
    } finally {
      setSavingEffectif(false);
    }
  }

  async function toggleActifHorsVacances(id: string, current: boolean) {
    await fetch(`/api/creneaux/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actifHorsVacances: !current }),
    });
    router.refresh();
  }

  type Chip = { key: string; kind: "creneau" | "evenement"; debut: string; fin: string; label: string; sousLabel: string; color: string; onClick: () => void; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void; dragOpacity?: number };

  const chipsByDay: Chip[][] = JOURS.map((_, i) => {
    const chips: Chip[] = [];
    for (const c of creneaux.filter((c) => c.jour === i)) {
      chips.push({
        key: `c-${c.id}`,
        kind: "creneau",
        debut: c.debut,
        fin: c.fin,
        label: c.groupe.nom,
        sousLabel: [c.libelleCoach ?? c.coach?.user.name ?? "—", c.groupe.objectif].filter(Boolean).join(" · "),
        color: ETAT_COLOR[c.etat],
        onClick: () => openEditCreneau(c),
        draggable: true,
        onDragStart: (e) => {
          e.dataTransfer.setData("text/plain", c.id);
          setDraggedId(c.id);
        },
        onDragEnd: () => setDraggedId(null),
        dragOpacity: draggedId === c.id ? 0.4 : 1,
      });
    }
    for (const e of evenements.filter((e) => e.jour === i)) {
      chips.push({
        key: `e-${e.id}`,
        kind: "evenement",
        debut: e.debut,
        fin: e.fin,
        label: e.titre,
        sousLabel: [CATEGORIE_EVENEMENT_LABEL[e.categorie], e.coach?.user.name].filter(Boolean).join(" · "),
        color: CATEGORIE_EVENEMENT_COLOR[e.categorie],
        onClick: () => openEditEvenement(e),
      });
    }
    return chips.sort((a, b) => a.debut.localeCompare(b.debut));
  });

  const echeancesByDay: EcheanceLite[][] = JOURS.map((_, i) => prochainesEcheances.filter((e) => e.jour === i).slice(0, 3));

  const editingCreneau = editing?.type === "CRENEAU" ? creneaux.find((c) => c.id === editing.id) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
        La semaine type définit les rendez-vous récurrents hors vacances scolaires — entraînements, mais
        aussi réunions, forums ou autres rendez-vous d&apos;équipe. Elle se met en pause automatiquement
        pendant les vacances (réglage par créneau d&apos;entraînement) ; les stages se saisissent dans
        l&apos;onglet « Vacances &amp; stages », et les dates précises (compétitions...) dans « Dates
        spécifiques ».
      </div>

      <div className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
        Clique sur un rendez-vous pour voir le détail et le modifier. Glisse une carte d&apos;entraînement
        pour la déplacer sur un autre jour.
      </div>

      <div className="overflow-x-auto pb-1.5">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(7,minmax(178px,1fr))", minWidth: 1180 }}>
          {JOURS.map((nom, i) => (
            <div
              key={nom}
              className="flex flex-col gap-1.5 rounded-[11px]"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDay(i);
              }}
              onDragLeave={() => setDragOverDay((d) => (d === i ? null : d))}
              onDrop={(e) => onDrop(e, i)}
              style={{ outline: dragOverDay === i ? "2px dashed #1E7BFF" : "2px dashed transparent", outlineOffset: 3 }}
            >
              <div className="text-center rounded-[11px] p-2.5" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                <div className="font-display text-[15px] tracking-[0.12em] uppercase">{nom}</div>
              </div>

              {chipsByDay[i].map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.onClick}
                  draggable={chip.draggable}
                  onDragStart={chip.onDragStart}
                  onDragEnd={chip.onDragEnd}
                  className="rounded-[9px] px-2.5 py-2 text-left cursor-pointer w-full"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${chip.color}`,
                    opacity: chip.dragOpacity ?? 1,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: chip.color }}>
                      {chip.debut}
                    </span>
                    <span className="text-[13px] font-semibold leading-tight truncate">{chip.label}</span>
                  </div>
                  <div className="text-[11px] truncate" style={{ color: "var(--ink-secondary)" }}>
                    {chip.sousLabel}
                  </div>
                </button>
              ))}

              {echeancesByDay[i].map((e) => (
                <button
                  key={e.id}
                  onClick={() => setDetailEcheance(e)}
                  className="rounded-[9px] px-2.5 py-1.5 text-left cursor-pointer w-full"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${e.color}` }}
                  title="Échéance ponctuelle — voir « Dates spécifiques » pour modifier"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: e.color }}>
                      {new Date(e.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <span className="text-[11px] font-semibold truncate" style={{ color: "var(--ink-body)" }}>
                      {e.titre}
                    </span>
                  </div>
                </button>
              ))}

              <button
                onClick={() => openModal(i)}
                className="rounded-[11px] p-2.5 text-xs cursor-pointer"
                style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-muted)" }}
              >
                + ajouter
              </button>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-y-auto" style={{ maxWidth: 560, maxHeight: "88vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">{editing ? "Modifier" : "Nouveau rendez-vous"} — {JOURS[form.jour]}</h2>
              <button onClick={() => setModalOpen(false)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Type
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {ITEM_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setForm((f) => ({ ...f, itemType: t.value }))}
                      disabled={!!editing}
                      className="rounded-[10px] px-3.5 py-2 text-xs font-bold"
                      style={{
                        cursor: editing ? "not-allowed" : "pointer",
                        opacity: editing && form.itemType !== t.value ? 0.4 : 1,
                        border: `1px solid ${form.itemType === t.value ? colorFor(t.value, "ASSURE") : "var(--border-strong)"}`,
                        background: form.itemType === t.value ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)",
                        color: form.itemType === t.value ? colorFor(t.value, "ASSURE") : "var(--ink-body)",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {editing && (
                  <div className="text-[11px] mt-1.5" style={{ color: "var(--ink-muted)" }}>
                    Le type ne peut pas changer après création — supprime et recrée si besoin.
                  </div>
                )}
              </div>

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

              {form.itemType === "ENTRAINEMENT" ? (
                <>
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
                  {editingCreneau && (
                    <div className="flex flex-col gap-2 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                      <button
                        onClick={() => toggleActifHorsVacances(editingCreneau.id, editingCreneau.actifHorsVacances)}
                        className="text-[12px] cursor-pointer underline text-left"
                        style={{ color: "var(--ink-secondary)" }}
                        title="Bascule si ce créneau continue ou non pendant les vacances scolaires"
                      >
                        {editingCreneau.actifHorsVacances ? "En pause pendant les vacances" : "Continue pendant les vacances"}
                      </button>
                      <button
                        onClick={() => openEffectif(editingCreneau)}
                        className="text-[12px] cursor-pointer underline text-left"
                        style={{ color: "var(--ink-secondary)" }}
                        title="Choisir qui, dans le groupe, assiste à ce créneau"
                      >
                        {editingCreneau.effectifNageurs.length > 0 ? `Effectif : ${editingCreneau.effectifNageurs.length} nageur${editingCreneau.effectifNageurs.length > 1 ? "s" : ""}` : "Effectif : tout le groupe"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                      Titre
                    </div>
                    <input
                      value={form.titre}
                      onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
                      placeholder="ex. Réunion coachs, Forum des sports…"
                      className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                        Coach / responsable
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
                        Lieu
                      </div>
                      <input
                        value={form.lieu}
                        onChange={(e) => setForm((f) => ({ ...f, lieu: e.target.value }))}
                        placeholder="optionnel"
                        className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end items-center">
              {editing && (
                <button
                  onClick={removeEditing}
                  disabled={deleting}
                  className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer mr-auto"
                  style={{ border: "1px solid var(--border-strong)", color: "#E8442B", opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting ? "Suppression…" : "Supprimer"}
                </button>
              )}
              <button onClick={() => setModalOpen(false)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button
                onClick={submit}
                disabled={saving || formIncomplet}
                className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving || formIncomplet ? 0.5 : 1, cursor: saving || formIncomplet ? "not-allowed" : "pointer" }}
              >
                {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailEcheance && (
        <div onClick={() => setDetailEcheance(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: 440, background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)", borderLeft: `4px solid ${detailEcheance.color}` }}>
              <div>
                <h2 className="font-display text-[20px] tracking-[0.05em]">{detailEcheance.titre}</h2>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                  {new Date(detailEcheance.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
                </div>
              </div>
              <button onClick={() => setDetailEcheance(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              <div className="text-sm" style={{ color: "var(--ink-body)" }}>
                {detailEcheance.detail}
              </div>
              <div className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
                Échéance ponctuelle — modifiable depuis l&apos;onglet « Dates spécifiques ».
              </div>
            </div>
          </div>
        </div>
      )}

      {effectifCreneau && (
        <div onClick={() => setEffectifCreneau(null)} className="fixed inset-0 z-[110] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 480, maxHeight: "82vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <div>
                <h2 className="font-display text-[22px] tracking-[0.05em]">Effectif — {effectifCreneau.groupe.nom}</h2>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                  {JOURS[effectifCreneau.jour]} {effectifCreneau.debut}–{effectifCreneau.fin}
                </div>
              </div>
              <button onClick={() => setEffectifCreneau(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 pt-4 flex gap-1.5">
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
                onClick={saveEffectif}
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
