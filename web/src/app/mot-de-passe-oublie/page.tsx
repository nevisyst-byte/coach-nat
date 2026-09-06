"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
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
          Mot de passe oublié
        </h1>

        {sent ? (
          <>
            <p className="text-[13px] mb-6" style={{ color: "var(--ink-secondary)" }}>
              Si un compte existe avec cette adresse, un mail vient d&apos;être envoyé avec un lien pour
              choisir un nouveau mot de passe (valable 1 heure).
            </p>
            <Link
              href="/login"
              className="block text-center rounded-lg py-3 text-[13px] font-bold"
              style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}
            >
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <p className="text-[13px] mb-6" style={{ color: "var(--ink-secondary)" }}>
              Indique ton adresse mail, on t&apos;envoie un lien de réinitialisation.
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
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg py-3 text-[13px] font-bold cursor-pointer mt-2"
                style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
              <Link href="/login" className="text-[12px] text-center" style={{ color: "var(--ink-secondary)" }}>
                Retour à la connexion
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
