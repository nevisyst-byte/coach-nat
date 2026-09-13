"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OBJECTIFS, couleurObjectif } from "@/lib/objectifs";
import { Button } from "@/components/ui/Button";
import { SeanceContenuEditor, contenuVide, combosValidesPour, type SeanceContenu, type Modele } from "./SeanceContenuEditor";

export type ModeleModalOpen = { mode: "new" } | { mode: "edit"; modele: Modele };

type Form = SeanceContenu & { nom: string; theme: string };

function formulaireDepuis(open: ModeleModalOpen): Form {
  if (open.mode === "edit") {
    const m = open.modele;
    const aSections = !!m.sections && m.sections.length > 0;
    return {
      nom: m.nom,
      theme: m.theme,
      mode: aSections ? "manuel" : "auto",
      heureDebut: m.heureDebut ?? "18:00",
      combos: m.combos && m.combos.length > 0 ? m.combos : contenuVide().combos,
      volume: m.volumeNage ?? 3000,
      sections: aSections ? m.sections! : contenuVide().sections,
    };
  }
  return { ...contenuVide(), nom: "", theme: OBJECTIFS[0].nom };
}

// Fenêtre de création/édition d'un modèle de séance — la bibliothèque que
// le coach gère lui-même (ajoute/modifie/supprime), indépendamment de tout
// plan ou créneau, pour rejouer une séance déjà construite sans repartir de
// zéro chaque fois qu'il en a besoin.
export function ModeleModal({ open, onClose, onSaved }: { open: ModeleModalOpen; onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => formulaireDepuis(open));
  const [saving, setSaving] = useState(false);

  async function enregistrer() {
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { nom: form.nom.trim(), theme: form.theme, heureDebut: form.heureDebut };
      if (form.mode === "manuel") {
        payload.sections = form.sections;
        if (open.mode === "edit") {
          payload.combos = null;
          payload.volumeNage = null;
        }
      } else {
        payload.combos = form.combos;
        payload.volumeNage = form.volume;
        if (open.mode === "edit") payload.sections = null;
      }

      if (open.mode === "edit") {
        await fetch(`/api/modeles-seance/${open.modele.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/modeles-seance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      router.refresh();
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function supprimer() {
    if (open.mode !== "edit") return;
    await fetch(`/api/modeles-seance/${open.modele.id}`, { method: "DELETE" });
    router.refresh();
    onSaved();
    onClose();
  }

  const combosValides = combosValidesPour(form);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth: 700, maxHeight: "90vh", background: "#101A2B", border: "1px solid var(--border-strong)" }}>
        <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
          <h2 className="font-display text-[20px] tracking-[0.05em]">{open.mode === "new" ? "Nouveau modèle de séance" : "Modifier le modèle"}</h2>
          <button onClick={onClose} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
            ✕
          </button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[12px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
                Nom du modèle
              </div>
              <input
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="ex. Technique jambes — rattrapage"
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              />
            </div>
            <div>
              <div className="text-[12px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
                Objectif (macro)
              </div>
              <select
                value={form.theme}
                onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: couleurObjectif(form.theme) }}
              >
                {OBJECTIFS.map((o) => (
                  <option key={o.nom} value={o.nom} style={{ background: "#101A2B", color: o.color }}>
                    {o.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SeanceContenuEditor value={form} onChange={(updater) => setForm((f) => ({ ...f, ...updater(f) }))} />
        </div>

        <div className="px-6 py-4 flex gap-2.5" style={{ borderTop: "1px solid var(--border)" }}>
          {open.mode === "edit" && (
            <Button variant="danger" onClick={supprimer}>
              Supprimer
            </Button>
          )}
          <Button variant="primary" className="flex-1" disabled={saving || !form.nom.trim() || !combosValides} onClick={enregistrer}>
            {saving ? "Enregistrement…" : open.mode === "new" ? "+ Créer le modèle" : "Enregistrer les modifications"}
          </Button>
        </div>
      </div>
    </div>
  );
}
