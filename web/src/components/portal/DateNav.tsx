"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DateNav({ slot, date, stepDays }: { slot: string; date: string; stepDays: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function go(newDate: string) {
    const params = new URLSearchParams(searchParams);
    params.set("slot", slot);
    params.set("date", newDate);
    router.push(`/presences?${params.toString()}`);
  }

  function shift(days: number) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    go(d.toISOString().slice(0, 10));
  }

  return (
    <div className="flex items-center gap-1.5 rounded-[10px] p-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }}>
      <button onClick={() => shift(-stepDays)} className="px-2 py-1 text-[15px] cursor-pointer">
        ‹
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => go(e.target.value)}
        className="bg-transparent border-0 outline-none text-[13px] font-semibold cursor-pointer"
        style={{ color: "var(--ink)" }}
      />
      <button onClick={() => shift(stepDays)} className="px-2 py-1 text-[15px] cursor-pointer">
        ›
      </button>
    </div>
  );
}
