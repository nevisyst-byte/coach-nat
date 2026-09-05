"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateUserForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "COACH", initials: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      setForm({ email: "", name: "", password: "", role: "COACH", initials: "" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
      <input required placeholder="Nom complet" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
      <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
      <input required type="password" placeholder="Mot de passe (min. 6)" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }} />
      <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="rounded-[9px] px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
        <option value="COACH" style={{ background: "#101A2B" }}>
          Coach
        </option>
        <option value="ADMIN" style={{ background: "#101A2B" }}>
          Administrateur
        </option>
      </select>
      <button type="submit" disabled={saving} className="rounded-[9px] px-4 py-2.5 text-[13px] font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
        {saving ? "Création…" : "Créer le compte"}
      </button>
      {error && (
        <div className="text-[13px]" style={{ gridColumn: "1 / -1", color: "#FF9179" }}>
          {error}
        </div>
      )}
    </form>
  );
}
