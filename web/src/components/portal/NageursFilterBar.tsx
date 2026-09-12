"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { POLE_LABELS } from "@/lib/theme";

const POLE_ORDER = ["COMPETITION", "FORMATION", "SAUVETAGE", "LOISIR"] as const;

export function NageursFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const pole = searchParams.get("pole") ?? "";

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (q) params.set("q", q);
      else params.delete("q");
      router.push(`/nageurs?${params.toString()}`);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setPole(p: string) {
    const params = new URLSearchParams(searchParams);
    if (!p) params.delete("pole");
    else params.set("pole", p);
    router.push(`/nageurs?${params.toString()}`);
  }

  return (
    <div className="p-4 md:px-5 md:py-4 flex gap-3 flex-wrap items-center" style={{ borderBottom: "1px solid var(--border)" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un nageur…"
        className="flex-1 rounded-[10px] px-3.5 py-2.5 text-sm outline-none"
        style={{ minWidth: 200, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)", color: "var(--ink)" }}
      />
      <div className="flex items-center gap-2 rounded-[10px] px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }}>
        <span className="text-[13px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-secondary)" }}>
          Pôle
        </span>
        <select
          value={pole}
          onChange={(e) => setPole(e.target.value)}
          className="bg-transparent border-0 outline-none text-sm font-semibold cursor-pointer"
          style={{ color: "var(--ink)" }}
        >
          <option value="" style={{ background: "#101A2B" }}>
            Tous les pôles
          </option>
          {POLE_ORDER.map((p) => (
            <option key={p} value={p} style={{ background: "#101A2B" }}>
              {POLE_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
