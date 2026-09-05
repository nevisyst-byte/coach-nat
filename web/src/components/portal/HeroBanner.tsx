"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { heroFor, heroVeilCss } from "@/lib/screens";

export function HeroBanner() {
  const pathname = usePathname();
  const hero = heroFor(pathname);
  if (!hero) return null;

  return (
    <div
      className="relative overflow-hidden rounded-[18px] p-6 md:p-7 flex items-end justify-between gap-6 flex-wrap"
      style={{
        border: "1px solid var(--border-strong)",
        backgroundColor: "var(--bg-base)",
        backgroundImage: heroVeilCss(hero),
        backgroundSize: "cover",
        backgroundPosition: hero.pos,
        minHeight: 170,
      }}
    >
      <div>
        <div className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "#7FDCFF" }}>
          {hero.kicker}
        </div>
        <h2 className="font-display mt-2 max-w-[520px] text-[28px] md:text-[36px] leading-[1.02]">{hero.title}</h2>
        <p className="mt-2.5 max-w-[400px] text-sm leading-[1.55]" style={{ color: "var(--ink-on-photo)" }}>
          {hero.text}
        </p>
      </div>
      <div className="flex gap-2.5 flex-wrap">
        {hero.cta1 && (
          <Link
            href={hero.cta1.href}
            className="rounded-[11px] px-5 py-3 text-[13px] font-bold"
            style={{ background: "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: "#fff" }}
          >
            {hero.cta1.label}
          </Link>
        )}
        {hero.cta2 && (
          <Link
            href={hero.cta2.href}
            className="rounded-[11px] px-5 py-3 text-[13px] font-semibold"
            style={{ border: "1px solid rgba(255,255,255,0.24)", background: "rgba(255,255,255,0.08)", color: "var(--ink)", backdropFilter: "blur(6px)" }}
          >
            {hero.cta2.label}
          </Link>
        )}
      </div>
    </div>
  );
}
