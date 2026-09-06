"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connexion impossible");
        return;
      }
      const next = params.get("next");
      router.push(next || "/general");
      router.refresh();
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
      <div
        className="w-full max-w-[380px] rounded-2xl p-8"
        style={{ background: "var(--bg-card-alt)", border: "1px solid var(--border-strong)" }}
      >
        <div className="flex flex-col items-center gap-2 mb-7">
          <Image
            src="/assets/logo-crest.png"
            alt="COACH FT"
            width={56}
            height={56}
            style={{ borderRadius: 13, border: "1px solid rgba(36,200,255,0.3)" }}
          />
          <div className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--ink-tertiary)" }}>
            Portail coachs
          </div>
        </div>

        <h1
          className="font-display text-[26px] mb-1"
          style={{ letterSpacing: "0.02em" }}
        >
          Connexion
        </h1>
        <p className="text-[13px] mb-6" style={{ color: "var(--ink-secondary)" }}>
          Accède à ton espace coach ou d&apos;administration.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
              Email
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@coach-nat.fr"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-strong)",
                color: "var(--ink)",
              }}
            />
          </div>
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "var(--ink-tertiary)" }}>
              Mot de passe
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-strong)",
                color: "var(--ink)",
              }}
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
            style={{
              background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)",
              color: "#fff",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>

          <Link href="/mot-de-passe-oublie" className="text-[12px] text-center" style={{ color: "var(--ink-secondary)" }}>
            Mot de passe oublié ?
          </Link>
        </form>
      </div>
    </div>
  );
}
