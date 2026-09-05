"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ZoneScolaireSetting({ zone }: { zone: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function setZone(zoneScolaire: string) {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneScolaire }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {["A", "B", "C"].map((z) => (
        <button
          key={z}
          disabled={saving}
          onClick={() => setZone(z)}
          className="rounded-[9px] px-3.5 py-2 text-sm font-bold cursor-pointer"
          style={{
            border: `1px solid ${zone === z ? "#1E7BFF" : "var(--border-strong)"}`,
            background: zone === z ? "rgba(30,123,255,0.18)" : "rgba(255,255,255,0.04)",
            color: zone === z ? "var(--ink)" : "var(--ink-body)",
            opacity: saving ? 0.6 : 1,
          }}
        >
          Zone {z}
        </button>
      ))}
    </div>
  );
}
