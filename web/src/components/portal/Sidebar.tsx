"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/theme";
import { useNavState } from "./NavState";

export function Sidebar({ userName, roleLabel = "Coach · Accès total" }: { userName: string; roleLabel?: string }) {
  const pathname = usePathname();
  const { open } = useNavState();

  const isActive = (href: string) =>
    href === "/nageurs" ? pathname === "/nageurs" || pathname.startsWith("/nageurs/") : pathname === href;

  return (
    <aside
      className="hidden md:flex flex-col sticky top-0 h-screen shrink-0 overflow-hidden"
      style={{
        width: open ? 252 : 78,
        background: "linear-gradient(180deg,var(--bg-nav-top),var(--bg-nav-bottom))",
        borderRight: "1px solid var(--border)",
        transition: "width .18s ease",
      }}
    >
      <div
        className="flex flex-col items-center gap-2 border-b"
        style={{
          padding: open ? "18px 16px 14px" : "18px 10px 14px",
          borderColor: "var(--border)",
          backgroundImage:
            "linear-gradient(180deg,rgba(11,21,36,0.5),rgba(11,21,36,0.94)), url('/assets/water-texture.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {open ? (
          <Image
            src="/assets/logo-lockup.png"
            alt="COACH FT"
            width={196}
            height={80}
            style={{ width: "100%", maxWidth: 196, height: "auto", borderRadius: 12, border: "1px solid rgba(36,200,255,0.25)" }}
            priority
          />
        ) : (
          <Image
            src="/assets/logo-crest.png"
            alt="COACH FT"
            width={46}
            height={46}
            style={{ borderRadius: 11, border: "1px solid rgba(36,200,255,0.3)" }}
          />
        )}
        {open && (
          <div className="text-[10px] tracking-[0.2em] uppercase whitespace-nowrap" style={{ color: "var(--ink-tertiary)" }}>
            Portail coachs
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3.5">
            {open ? (
              <div className="text-[10px] tracking-[0.18em] uppercase px-2.5 pt-1.5 pb-1.5" style={{ color: "#61789B" }}>
                {group.label}
              </div>
            ) : (
              <div className="h-px mx-2 my-2" style={{ background: "var(--border)" }} />
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={item.label}
                    className="flex items-center gap-2.5 w-full rounded-[9px] px-2.5 py-2.5 text-sm"
                    style={{
                      justifyContent: open ? "flex-start" : "center",
                      fontWeight: active ? 700 : 500,
                      color: active ? "var(--ink)" : "var(--ink-body)",
                      background: active ? "linear-gradient(90deg,rgba(30,123,255,0.22),rgba(30,123,255,0.02))" : "transparent",
                      borderLeft: `3px solid ${active ? "var(--cyan)" : "transparent"}`,
                    }}
                  >
                    <span className="text-[15px] w-[18px] text-center opacity-90">{item.icon}</span>
                    {open && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className="flex items-center gap-2.5 border-t px-3.5 py-3"
        style={{ borderColor: "var(--border)", justifyContent: open ? "flex-start" : "center" }}
      >
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-bold text-[13px] shrink-0"
          style={{ background: "linear-gradient(135deg,#1E7BFF,#E8442B)" }}
        >
          {userName
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        {open && (
          <div className="min-w-0">
            <div className="text-[13px] font-semibold whitespace-nowrap">{userName}</div>
            <div className="text-[11px]" style={{ color: "var(--ink-secondary)" }}>
              {roleLabel}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
