"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UserRow = { id: string; name: string; email: string; role: "ADMIN" | "COACH"; initials: string | null };

export function UsersTable({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "COACH" as "ADMIN" | "COACH", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openEdit(u: UserRow) {
    setForm({ name: u.name, email: u.email, role: u.role, password: "" });
    setError(null);
    setEditing(u);
  }

  async function submitEdit() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      setEditing(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: UserRow) {
    if (!confirm(`Supprimer le compte de ${u.name} ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Erreur lors de la suppression");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.03)" }}>
            {["Nom", "Email", "Rôle", "Initiales", ""].map((h) => (
              <th key={h} className="text-left text-[12px] tracking-[0.12em] uppercase px-5 py-3" style={{ color: "var(--ink-tertiary)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td className="px-5 py-3 text-sm font-semibold">{u.name}</td>
              <td className="px-5 py-3 text-[13px]" style={{ color: "var(--ink-body)" }}>
                {u.email}
              </td>
              <td className="px-5 py-3">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-md"
                  style={{ background: u.role === "ADMIN" ? "rgba(232,68,43,0.16)" : "rgba(30,123,255,0.16)", color: u.role === "ADMIN" ? "#FF9179" : "#7FDCFF" }}
                >
                  {u.role === "ADMIN" ? "Administrateur" : "Coach"}
                </span>
              </td>
              <td className="px-5 py-3 text-[13px]" style={{ color: "var(--ink-body)" }}>
                {u.initials ?? "—"}
              </td>
              <td className="px-5 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => openEdit(u)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer mr-2"
                  style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                >
                  Modifier
                </button>
                <button
                  onClick={() => remove(u)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  style={{ border: "1px solid rgba(232,68,43,0.35)", background: "rgba(232,68,43,0.12)", color: "#FF9179" }}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div onClick={() => setEditing(null)} className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(4,7,14,0.78)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl" style={{ maxWidth: 480, background: "#101A2B", border: "1px solid var(--border-strong)" }}>
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-strong)" }}>
              <h2 className="font-display text-[22px] tracking-[0.05em]">Modifier le compte</h2>
              <button onClick={() => setEditing(null)} className="w-[34px] h-[34px] rounded-[9px] cursor-pointer" style={{ border: "1px solid var(--border-strong)" }}>
                ✕
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3.5">
              <div>
                <div className="text-[12px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
                  Nom complet
                </div>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
              </div>
              <div>
                <div className="text-[12px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
                  Email
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
              </div>
              <div>
                <div className="text-[12px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
                  Rôle
                </div>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "COACH" }))}
                  className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                >
                  <option value="COACH" style={{ background: "#101A2B" }}>
                    Coach
                  </option>
                  <option value="ADMIN" style={{ background: "#101A2B" }}>
                    Administrateur
                  </option>
                </select>
              </div>
              <div>
                <div className="text-[12px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
                  Nouveau mot de passe (optionnel)
                </div>
                <input
                  type="password"
                  placeholder="Laisser vide pour ne pas changer"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-[9px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
              </div>
              {error && (
                <div className="text-[13px]" style={{ color: "#FF9179" }}>
                  {error}
                </div>
              )}
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2.5 justify-end">
              <button onClick={() => setEditing(null)} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                Annuler
              </button>
              <button
                onClick={submitEdit}
                disabled={saving}
                className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
