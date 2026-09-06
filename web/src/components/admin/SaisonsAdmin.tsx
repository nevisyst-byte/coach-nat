"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SaisonRow = { id: string; label: string; dateDebut: string; dateFin: string; active: boolean };

export function SaisonsAdmin({ saisons }: { saisons: SaisonRow[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [resetDonnees, setResetDonnees] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetConfirme = !resetDonnees || confirmText.trim().toUpperCase() === "RÉINITIALISER";

  async function activer(id: string) {
    await fetch(`/api/admin/saisons/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: true }) });
    router.refresh();
  }

  async function creer() {
    if (!label.trim() || !dateDebut || !dateFin || !resetConfirme) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/saisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), dateDebut, dateFin, activer: true, resetDonnees }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      setFormOpen(false);
      setLabel("");
      setDateDebut("");
      setDateFin("");
      setResetDonnees(false);
      setConfirmText("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {saisons.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-[11px] px-3.5 py-2.5 flex-wrap" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <div className="text-sm font-semibold flex-1" style={{ minWidth: 100 }}>
              Saison {s.label}
            </div>
            <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
              {s.dateDebut} → {s.dateFin}
            </div>
            {s.active ? (
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-md" style={{ background: "rgba(46,204,143,0.16)", color: "#2ECC8F" }}>
                Active
              </span>
            ) : (
              <button onClick={() => activer(s.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Activer
              </button>
            )}
          </div>
        ))}
        {saisons.length === 0 && (
          <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Aucune saison enregistrée.
          </div>
        )}
      </div>

      {!formOpen ? (
        <button
          onClick={() => setFormOpen(true)}
          className="self-start rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
          style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}
        >
          ＋ Nouvelle saison
        </button>
      ) : (
        <div className="rounded-[11px] p-4 flex flex-col gap-3.5" style={{ border: "1px solid var(--border-strong)", background: "rgba(255,255,255,0.02)" }}>
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
              Libellé (ex. 2026-2027)
            </div>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="2026-2027"
              className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                Début
              </div>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
            </div>
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#61789B" }}>
                Fin
              </div>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-[13px] cursor-pointer" style={{ color: "var(--ink-body)" }}>
            <input type="checkbox" checked={resetDonnees} onChange={(e) => setResetDonnees(e.target.checked)} className="mt-0.5" />
            <span>
              Réinitialiser nageurs, groupes, créneaux et stages pour repartir de zéro sur cette saison.
              <br />
              <span style={{ color: "#FF9179" }}>Irréversible — supprime tous les nageurs, groupes, créneaux et stages actuels.</span> Les
              séances et présences déjà pointées restent conservées comme historique.
            </span>
          </label>

          {resetDonnees && (
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#FF9179" }}>
                Tape RÉINITIALISER pour confirmer
              </div>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RÉINITIALISER"
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(232,68,43,0.4)", color: "var(--ink)" }}
              />
            </div>
          )}

          {error && (
            <div className="text-[13px]" style={{ color: "#FF9179" }}>
              {error}
            </div>
          )}

          <div className="flex gap-2.5 justify-end">
            <button
              onClick={() => setFormOpen(false)}
              className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer"
              style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}
            >
              Annuler
            </button>
            <button
              onClick={creer}
              disabled={saving || !label.trim() || !dateDebut || !dateFin || !resetConfirme}
              className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer"
              style={{ background: resetDonnees ? "linear-gradient(135deg,#E8442B,#B92E19)" : "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving || !resetConfirme ? 0.6 : 1 }}
            >
              {saving ? "Création…" : resetDonnees ? "Créer et réinitialiser" : "Créer et activer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
