"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { titleFor } from "@/lib/screens";
import { useNavState } from "./NavState";

type SearchResult = { kind: string; label: string; href: string; meta: string };

export function Header({
  userName,
  roleLabel,
  isAdmin = false,
  saisonLabel,
}: {
  userName: string;
  roleLabel?: string;
  isAdmin?: boolean;
  saisonLabel: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggle } = useNavState();
  const { title, subtitle, pole } = titleFor(pathname);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setResults(d.results ?? []))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setResults([]);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-4 flex-wrap px-4 py-4 md:px-6"
      style={{
        backdropFilter: "blur(12px)",
        background: "rgba(8,13,24,0.82)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <button
        onClick={toggle}
        className="hidden md:flex items-center justify-center w-9 h-9 rounded-[9px] cursor-pointer text-base"
        style={{ border: "1px solid var(--border-strong)", background: "rgba(255,255,255,0.04)", color: "var(--ink)" }}
      >
        ☰
      </button>

      <div className="flex-1 min-w-[160px]">
        <div className="text-[11px] tracking-[0.18em] uppercase mb-1" style={{ color: "var(--ink-tertiary)" }}>
          {pole}
        </div>
        <h1 className="font-display text-[22px] md:text-[28px] leading-none">{title}</h1>
        <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
          {subtitle}
        </div>
      </div>

      {/* Rond profil mobile : sur la ligne du titre, jamais accolé à la barre de
          recherche qui, elle, passe systématiquement à la ligne suivante. */}
      <div className="relative md:hidden shrink-0" ref={profileRef}>
        <button
          onClick={() => setProfileOpen((o) => !o)}
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer shrink-0"
          style={{ background: "linear-gradient(135deg,#1E7BFF,#E8442B)", color: "#fff" }}
          title={userName}
        >
          {userName
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </button>
        {profileOpen && (
          <div
            className="absolute top-[48px] right-0 z-40 rounded-xl overflow-hidden"
            style={{ width: 220, background: "#101A2B", border: "1px solid var(--border-strong)", boxShadow: "0 24px 60px rgba(0,0,0,0.55)" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                {userName}
              </div>
              {roleLabel && (
                <div className="text-[12px]" style={{ color: "var(--ink-secondary)" }}>
                  {roleLabel}
                </div>
              )}
            </div>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setProfileOpen(false)}
                className="block px-4 py-3 text-sm font-semibold"
                style={{ color: "#8CC4FF", borderBottom: "1px solid var(--border)" }}
              >
                ⚙ Administration COACH-NAT
              </Link>
            )}
            <button
              onClick={logout}
              className="w-full text-left px-4 py-3 text-sm font-semibold cursor-pointer"
              style={{ color: "var(--ink-secondary)" }}
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
        <div className="relative min-w-[200px] flex-1 md:flex-none md:min-w-[250px]" ref={boxRef}>
          <div
            className="flex items-center gap-2 rounded-[10px] px-3 h-10"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }}
          >
            <span className="text-[13px]" style={{ color: "var(--ink-tertiary)" }}>
              ⌕
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un écran, un nageur…"
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm"
              style={{ color: "var(--ink)" }}
            />
          </div>
          {q.trim() && results.length > 0 && (
            <div
              className="absolute top-[46px] left-0 right-0 z-40 rounded-xl p-1.5 flex flex-col gap-0.5"
              style={{ background: "#101A2B", border: "1px solid var(--border-strong)", boxShadow: "0 24px 60px rgba(0,0,0,0.55)" }}
            >
              {results.map((r) => (
                <Link
                  key={r.href + r.label}
                  href={r.href}
                  onClick={() => setQ("")}
                  className="flex items-center gap-2.5 text-left rounded-[9px] px-2.5 py-2.5"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {r.label}
                    </span>
                    <span className="block text-[11px]" style={{ color: "var(--ink-secondary)" }}>
                      {r.kind} {r.meta}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          {q.trim() && results.length === 0 && (
            <div
              className="absolute top-[46px] left-0 right-0 z-40 rounded-xl p-3.5 text-[13px]"
              style={{ background: "#101A2B", border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}
            >
              Aucun résultat
            </div>
          )}
        </div>

        <div
          className="hidden sm:flex items-center gap-2 rounded-[10px] px-2.5 py-1.5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }}
        >
          <span className="text-xs uppercase tracking-[0.1em]" style={{ color: "var(--ink-secondary)" }}>
            {userName}
          </span>
        </div>
        {saisonLabel && (
          <div
            className="hidden lg:flex items-center rounded-[10px] px-3 py-2 text-xs font-bold tracking-[0.1em] uppercase"
            style={{ background: "rgba(30,123,255,0.12)", border: "1px solid rgba(30,123,255,0.4)", color: "#8CC4FF" }}
          >
            Saison {saisonLabel}
          </div>
        )}
        <button
          onClick={logout}
          className="hidden md:block rounded-[10px] px-3 py-2 text-xs font-semibold cursor-pointer"
          style={{ border: "1px solid var(--border-strong)", background: "transparent", color: "var(--ink-secondary)" }}
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}
