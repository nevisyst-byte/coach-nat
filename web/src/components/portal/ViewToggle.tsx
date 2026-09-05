"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function ViewToggle({ options, current, size = "md" }: { options: { value: string; label: string }[]; current: string; size?: "md" | "sm" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setVue(value: string) {
    const params = new URLSearchParams(searchParams);
    if (options[0]?.value === value) params.delete("vue");
    else params.set("vue", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-[10px] p-[3px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)" }}>
      {options.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            onClick={() => setVue(o.value)}
            className="rounded-[8px] text-xs font-bold cursor-pointer"
            style={{
              padding: size === "sm" ? "8px 13px" : "8px 14px",
              background: active ? "rgba(30,123,255,0.22)" : "transparent",
              color: active ? "var(--ink)" : "var(--ink-secondary)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
