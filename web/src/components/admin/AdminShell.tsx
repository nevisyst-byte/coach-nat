"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble", icon: "◈" },
  { href: "/admin/utilisateurs", label: "Utilisateurs & coachs", icon: "◉" },
  { href: "/admin/groupes", label: "Groupes", icon: "⚑" },
  { href: "/admin/nageurs", label: "Nageurs", icon: "☰" },
  { href: "/admin/effectifs", label: "Effectifs par catégorie", icon: "▦" },
  { href: "/admin/echeances", label: "Échéances de la saison", icon: "▣" },
  { href: "/admin/journal", label: "Journal d'activité", icon: "☰" },
];

export function AdminShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>
      <aside className="hidden lg:flex w-[240px] shrink-0 flex-col" style={{ background: "var(--bg-nav-top)", borderRight: "1px solid var(--border)" }}>
        <div className="p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="font-display text-lg tracking-[0.05em]">COACH-NAT</div>
          <div className="text-[10px] tracking-[0.2em] uppercase mt-1" style={{ color: "var(--ink-tertiary)" }}>
            Administration
          </div>
        </div>
        <nav className="flex-1 p-2.5 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-sm"
                style={{
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--ink)" : "var(--ink-body)",
                  background: active ? "linear-gradient(90deg,rgba(30,123,255,0.22),rgba(30,123,255,0.02))" : "transparent",
                  borderLeft: `3px solid ${active ? "var(--cyan)" : "transparent"}`,
                }}
              >
                <span className="w-[18px] text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3.5 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <Link href="/general" className="text-xs" style={{ color: "var(--cyan)" }}>
            ← Voir le portail coach
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between px-4 md:px-6 py-4 gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-sm min-w-0 truncate" style={{ color: "var(--ink-secondary)" }}>
            <span className="hidden sm:inline">Connecté en tant que </span>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>{userName}</span>
          </div>
          <button onClick={logout} className="rounded-[10px] px-3 py-2 text-xs font-semibold cursor-pointer shrink-0" style={{ border: "1px solid var(--border-strong)", color: "var(--ink-secondary)" }}>
            Déconnexion
          </button>
        </header>
        <nav className="lg:hidden flex gap-1.5 px-4 py-3 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)" }}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-[9px] px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
                style={{
                  color: active ? "var(--ink)" : "var(--ink-body)",
                  background: active ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? "#1E7BFF" : "var(--border-strong)"}`,
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          <Link href="/general" className="flex items-center rounded-[9px] px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0" style={{ color: "var(--cyan)", border: "1px solid var(--border-strong)" }}>
            ← Portail coach
          </Link>
        </nav>
        <main className="p-4 md:p-6 flex flex-col gap-4">{children}</main>
      </div>
    </div>
  );
}
