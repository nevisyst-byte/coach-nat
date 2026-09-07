"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
import { nouvelleSection, nouvelleSet, distanceSection, volumeTotalManuel, fmtDistance, type SectionManuelle } from "@/lib/seance-manual";
import { toDateInputValue } from "@/lib/week";

type Groupe = { id: string; nom: string };
type Section = { pole: string; nom: string; color: string; groupes: Groupe[] };
type Plan = { id: string; nom: string; heureDebut: string | null; sections: SectionManuelle[]; dateDebut: string; dateFin: string; groupes: Groupe[] };

type Form = {
  nom: string;
  heureDebut: string;
  dateDebut: string;
  dureeSemaines: number;
  groupeIds: string[];
  sections: SectionManuelle[];
};

function dureeEnSemaines(dateDebut: string, dateFin: string) {
  const jours = Math.round((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000) + 1;
  return Math.max(1, Math.round(jours / 7));
}

function formulaireVide(): Form {
  return {
    nom: "",
    heureDebut: "18:00",
    dateDebut: toDateInputValue(new Date()),
    dureeSemaines: 4,
    groupeIds: [],
    sections: [nouvelleSection("Échauffement")],
  };
}

export function PlanEntrainementClient({ groupesParPole, plans }: { groupesParPole: Section[]; plans: Plan[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(formulaireVide());
  const [saving, setSaving] = useState(false);

  function ouvrirNouveau() {
    setForm(formulaireVide());
    setEditingId("new");
  }

  function ouvrirEdition(p: Plan) {
    setForm({
      nom: p.nom,
      heureDebut: p.heureDebut ?? "18:00",
      dateDebut: toDateInputValue(new Date(p.dateDebut)),
      dureeSemaines: dureeEnSemaines(p.dateDebut, p.dateFin),
      groupeIds: p.groupes.map((g) => g.id),
      sections: p.sections,
    });
    setEditingId(p.id);
  }

  function toggleGroupe(id: string) {
    setForm((f) => ({ ...f, groupeIds: f.groupeIds.includes(id) ? f.groupeIds.filter((x) => x !== id) : [...f.groupeIds, id] }));
  }

  function ajouterSection() {
    setForm((f) => ({ ...f, sections: [...f.sections, nouvelleSection()] }));
  }
  function supprimerSection(id: string) {
    setForm((f) => ({ ...f, sections: f.sections.filter((s) => s.id !== id) }));
  }
  function renommerSection(id: string, nom: string) {
    setForm((f) => ({ ...f, sections: f.sections.map((s) => (s.id === id ? { ...s, nom } : s)) }));
  }
  function assignerObjectifSection(id: string, objectif: string) {
    setForm((f) => ({ ...f, sections: f.sections.map((s) => (s.id === id ? { ...s, objectif } : s)) }));
  }
  function ajouterSet(sectionId: string) {
    setForm((f) => ({ ...f, sections: f.sections.map((s) => (s.id === sectionId ? { ...s, sets: [...s.sets, nouvelleSet()] } : s)) }));
  }
  function supprimerSet(sectionId: string, setId: string) {
    setForm((f) => ({ ...f, sections: f.sections.map((s) => (s.id === sectionId ? { ...s, sets: s.sets.filter((x) => x.id !== setId) } : s)) }));
  }
  function updateSet(sectionId: string, setId: string, field: "reps" | "distance" | "label" | "allure" | "repos", value: string) {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s) =>
        s.id === sectionId
          ? { ...s, sets: s.sets.map((x) => (x.id === setId ? { ...x, [field]: field === "reps" || field === "distance" ? parseInt(value, 10) || 0 : value } : x)) }
          : s
      ),
    }));
  }

  async function enregistrer() {
    if (!form.nom.trim() || form.groupeIds.length === 0) return;
    setSaving(true);
    try {
      const payload = { nom: form.nom.trim(), heureDebut: form.heureDebut, sections: form.sections, dateDebut: form.dateDebut, dureeSemaines: form.dureeSemaines, groupeIds: form.groupeIds };
      if (editingId && editingId !== "new") {
        await fetch(`/api/plans-entrainement/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/plans-entrainement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      router.refresh();
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function supprimer(id: string) {
    await fetch(`/api/plans-entrainement/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="text-[13px] flex-1" style={{ color: "var(--ink-secondary)" }}>
          Un plan chiffré (sections et séries en distances libres, comme la saisie manuelle) appliqué automatiquement sur
          une période, à un ou plusieurs groupes à la fois — chaque créneau réel de ces groupes affiche ce contenu
          (visible sur Présences), et reste ajustable au cas par cas en %.
        </div>
        <button
          onClick={ouvrirNouveau}
          className="shrink-0 rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
          style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}
        >
          + Nouveau plan
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {plans.map((p) => (
          <div key={p.id} className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{p.nom}</div>
              <div className="text-[12px] mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                Du {new Date(p.dateDebut).toLocaleDateString("fr-FR")} au {new Date(p.dateFin).toLocaleDateString("fr-FR")} · {fmtDistance(volumeTotalManuel(p.sections))}
              </div>
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {p.groupes.map((g) => (
                  <span key={g.id} className="text-[11px] rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.06)", color: "var(--ink-body)" }}>
                    {g.nom}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => ouvrirEdition(p)} className="text-xs cursor-pointer shrink-0" style={{ color: "var(--cyan)" }}>
              Modifier
            </button>
            <button onClick={() => supprimer(p.id)} className="text-xs cursor-pointer shrink-0" style={{ color: "var(--ink-muted)" }}>
              Supprimer
            </button>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="text-[13px] py-8 text-center" style={{ color: "var(--ink-secondary)" }}>
            Aucun plan d&apos;entraînement pour l&apos;instant.
          </div>
        )}
      </div>

      {editingId && (
        <div onClick={() => setEditingId(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 720, maxHeight: "90vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[20px] tracking-[0.05em]">{editingId === "new" ? "Nouveau plan d'entraînement" : "Modifier le plan"}</h2>
              <button onClick={() => setEditingId(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Nom du plan
                  </div>
                  <input
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="ex. Bloc jambes octobre"
                    className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Date de début
                  </div>
                  <input
                    type="date"
                    value={form.dateDebut}
                    onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
                    className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                    Durée (semaines)
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={form.dureeSemaines}
                    onChange={(e) => setForm((f) => ({ ...f, dureeSemaines: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                    className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Heure de début (calcul des horaires)
                </div>
                <input
                  type="time"
                  value={form.heureDebut}
                  onChange={(e) => setForm((f) => ({ ...f, heureDebut: e.target.value }))}
                  className="rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)", width: 140 }}
                />
              </div>

              <div>
                <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                  Groupes concernés
                </div>
                <div className="flex flex-col gap-2">
                  {groupesParPole.map((section) => (
                    <div key={section.pole} className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] mr-1" style={{ color: section.color }}>
                        {section.nom}
                      </span>
                      {section.groupes.map((g) => {
                        const actif = form.groupeIds.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            onClick={() => toggleGroupe(g.id)}
                            className="rounded-full px-3 py-1 text-[12px] font-semibold cursor-pointer"
                            style={{
                              background: actif ? "linear-gradient(135deg,#1E7BFF,#0F5FD6)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${actif ? "transparent" : "var(--border)"}`,
                              color: actif ? "#fff" : "var(--ink-body)",
                            }}
                          >
                            {g.nom}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {form.sections.map((section) => (
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
                            placeholder="ex. Battements jambes"
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

              <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                Total : <strong style={{ color: "var(--ink)" }}>{fmtDistance(volumeTotalManuel(form.sections))}</strong>
              </div>
            </div>

            <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={enregistrer}
                disabled={saving || !form.nom.trim() || form.groupeIds.length === 0}
                className="w-full rounded-[10px] py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving || !form.nom.trim() || form.groupeIds.length === 0 ? 0.6 : 1 }}
              >
                {saving ? "Enregistrement…" : editingId === "new" ? "+ Créer le plan" : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
