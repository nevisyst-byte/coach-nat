"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_TABS } from "@/lib/theme";

export function MobileTabBar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/nageurs" ? pathname === "/nageurs" || pathname.startsWith("/nageurs/") : pathname === href;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch"
      style={{ background: "var(--bg-card-alt)", borderTop: "1px solid var(--border-strong)" }}
    >
      {MOBILE_TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5"
            style={{ color: active ? "var(--cyan)" : "var(--ink-secondary)", minHeight: 56 }}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em]">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
