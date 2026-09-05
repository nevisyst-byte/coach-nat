"use client";

import { useRouter } from "next/navigation";

export function SeanceSelect({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2.5 rounded-[10px] px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }}>
      <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-secondary)" }}>
        Séance
      </span>
      <select
        value={value}
        onChange={(e) => router.push(`/presences?slot=${encodeURIComponent(e.target.value)}`)}
        className="bg-transparent border-0 outline-none text-sm font-semibold cursor-pointer"
        style={{ color: "var(--ink)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#101A2B" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
