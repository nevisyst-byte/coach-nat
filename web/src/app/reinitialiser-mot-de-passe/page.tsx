"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense fallback={null}>
      <ReinitialiserForm />
    </Suspense>
  );
}

function ReinitialiserForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de réinitialiser le mot de passe");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(1200px 500px at 12% -10%, rgba(30,123,255,0.18), transparent 60%), radial-gradient(900px 420px at 100% 0%, rgba(232,68,43,0.12), transparent 60%), var(--bg-base)",
      }}
    >
      <div className="w-full max-w-[380px] rounded-2xl p-8" style={{ background: "var(--bg-card-alt)", border: "1px solid var(--border-strong)" }}>
        <div className="flex flex-col items-center gap-2 mb-7">
          <Image src="/assets/logo-crest.png" alt="COACH FT" width={56} height={56} style={{ borderRadius: 13, border: "1px solid rgba(36,200,255,0.3)" }} />
          <div className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--ink-tertiary)" }}>
            Portail coachs
          </div>
        </div>

        <h1 className="font-display text-[26px] mb-1" style={{ letterSpacing: "0.02em" }}>
          Nouveau mot de passe
        </h1>

        {!token ? (
          <p className="text-[13px]" style={{ color: "#FF9179" }}>
            Lien invalide — demande un nouveau lien depuis la page{" "}
            <Link href="/mot-de-passe-oublie" style={{ textDecoration: "underline" }}>
              mot de passe oublié
            </Link>
            .
          </p>
        ) : done ? (
          <p className="text-[13px]" style={{ color: "#2ECC8F" }}>
            Mot de passe mis à jour. Redirection vers la connexion…
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
                Nouveau mot de passe
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              />
            </div>
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
                Confirmer le mot de passe
              </div>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
              />
            </div>

            {error && (
              <div className="text-[13px] rounded-lg px-3 py-2" style={{ background: "rgba(232,68,43,0.12)", color: "#FF9179" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg py-3 text-[13px] font-bold cursor-pointer mt-2"
              style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Enregistrement…" : "Valider"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
