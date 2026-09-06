"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { initialsColor } from "@/lib/format";

type NageurRow = {
  id: string;
  nom: string;
  initiales: string;
  age: number;
  categorie: string;
  specialite: string;
  groupeId: string | null;
  groupeNom: string | null;
  pointsFFN: number;
  rangDept: number | null;
  rangReg: number | null;
  rangNat: number | null;
  presenceRate: number;
};

type Pole = { pole: string; nom: string; color: string; rows: NageurRow[] };
type Groupe = { id: string; nom: string };

const emptyForm = { nom: "", age: "14", categorie: "", specialite: "", groupeId: "" };

export function NageursListClient({ groupesByPole, allGroupes, isAdmin }: { groupesByPole: Pole[]; allGroupes: Groupe[]; isAdmin: boolean }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; id: string } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm(emptyForm);
    setModal({ mode: "create" });
  }

  function openEdit(n: NageurRow) {
    setForm({ nom: n.nom, age: String(n.age), categorie: n.categorie, specialite: n.specialite, groupeId: n.groupeId ?? "" });
    setModal({ mode: "edit", id: n.id });
  }

  async function submit() {
    if (!form.nom.trim() || !form.categorie.trim() || !form.specialite.trim()) return;
    setSaving(true);
    try {
      const body = { nom: form.nom.trim(), age: parseInt(form.age, 10) || 14, categorie: form.categorie.trim(), specialite: form.specialite.trim(), groupeId: form.groupeId || null };
      if (modal?.mode === "edit") {
        await fetch(`/api/admin/nageurs/${modal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        await fetch("/api/admin/nageurs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      setModal(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, nom: string) {
    if (!confirm(`Supprimer ${nom} ? Ses performances, notations et absences seront supprimées aussi.`)) return;
    await fetch(`/api/admin/nageurs/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      {isAdmin && (
        <div className="px-4 md:px-5 pt-4">
          <button
            onClick={openCreate}
            className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold cursor-pointer"
            style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}
          >
            + Nouveau nageur
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 p-4 md:p-5">
        {groupesByPole.map((g) => (
          <div key={g.pole} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", borderTop: `3px solid ${g.color}`, background: "var(--bg-card)" }}>
            <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
              <span className="font-display text-[17px] tracking-[0.05em] uppercase">{g.nom}</span>
              <span className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                {g.rows.length} nageur{g.rows.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-col">
              {g.rows.map((n) => {
                const p = n.presenceRate;
                const presBg = p >= 85 ? "rgba(46,204,143,0.14)" : p >= 70 ? "rgba(242,179,61,0.15)" : "rgba(232,68,43,0.16)";
                const presFg = p >= 85 ? "#2ECC8F" : p >= 70 ? "#F2B33D" : "#E8442B";
                return (
                  <div key={n.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                    <Link href={`/nageurs/${n.id}`} className="flex items-center gap-2.5" style={{ minWidth: 170 }}>
                      <div
                        className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: initialsColor(n.nom) }}
                      >
                        {n.initiales}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                          {n.nom}
                        </div>
                        <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                          {n.age} ans · {n.specialite}
                        </div>
                      </div>
                    </Link>
                    <div className="text-[13px]" style={{ minWidth: 60, color: "var(--ink-body)" }}>
                      {n.categorie}
                    </div>
                    <div className="text-[13px]" style={{ minWidth: 90, color: "var(--ink-body)" }}>
                      {n.groupeNom ?? "—"}
                    </div>
                    <div className="font-display text-lg" style={{ minWidth: 40 }}>
                      {n.pointsFFN || "—"}
                    </div>
                    <div className="hidden sm:block text-[13px]" style={{ color: "var(--ink-body)" }}>
                      {n.rangDept ? `${n.rangDept} / ${n.rangReg} / ${n.rangNat}` : "— / — / —"}
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: presBg, color: presFg }}>
                      {n.presenceRate}%
                    </span>
                    {isAdmin && (
                      <div className="flex gap-1.5 ml-auto">
                        <button onClick={() => openEdit(n)} className="rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                          Modifier
                        </button>
                        <button onClick={() => remove(n.id, n.nom)} className="rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div onClick={() => setModal(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl" style={{ maxWidth: 480, background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">{modal.mode === "edit" ? "Modifier le nageur" : "Nouveau nageur"}</h2>
              <button onClick={() => setModal(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3.5">
              <input
                placeholder="Nom complet"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              />
              <div className="grid grid-cols-2 gap-3.5">
                <input
                  type="number"
                  placeholder="Âge"
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
                <input
                  placeholder="Catégorie"
                  value={form.categorie}
                  onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
                  className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
              </div>
              <input
                placeholder="Spécialité"
                value={form.specialite}
                onChange={(e) => setForm((f) => ({ ...f, specialite: e.target.value }))}
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              />
              <select
                value={form.groupeId}
                onChange={(e) => setForm((f) => ({ ...f, groupeId: e.target.value }))}
                className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              >
                <option value="" style={{ background: "#101A2B" }}>
                  — groupe —
                </option>
                {allGroupes.map((g) => (
                  <option key={g.id} value={g.id} style={{ background: "#101A2B" }}>
                    {g.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end">
              <button onClick={() => setModal(null)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button
                onClick={submit}
                disabled={saving || !form.nom.trim() || !form.categorie.trim() || !form.specialite.trim()}
                className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Enregistrement…" : modal.mode === "edit" ? "Enregistrer" : "Créer le nageur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
