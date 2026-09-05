"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/Card";

const FILTRES = ["Tous", "Compétition", "École Natation", "Masters", "Sauvetage"];

export function NageursFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const filtre = searchParams.get("filtre") ?? "Tous";

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

  function setFiltre(f: string) {
    const params = new URLSearchParams(searchParams);
    if (f === "Tous") params.delete("filtre");
    else params.set("filtre", f);
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
      <div className="flex gap-1.5 flex-wrap">
        {FILTRES.map((f) => (
          <Chip key={f} active={filtre === f} onClick={() => setFiltre(f)}>
            {f}
          </Chip>
        ))}
      </div>
    </div>
  );
}
