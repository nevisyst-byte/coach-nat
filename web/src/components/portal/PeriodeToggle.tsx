"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Chip } from "@/components/ui/Card";

const PERIODES = [
  { label: "4 semaines", value: "4" },
  { label: "8 semaines", value: "8" },
  { label: "Saison", value: "saison" },
];

export function PeriodeToggle({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function set(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("periode", value);
    // /coach n'est qu'une redirection codée en dur vers /general (voir
    // app/(portal)/coach/page.tsx) : elle ne repropage pas la query string
    // d'origine, donc la période (et le coachId) revenait silencieusement
    // à sa valeur par défaut à chaque clic.
    router.push(`/general?${params.toString()}`);
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      {PERIODES.map((p) => (
        <Chip key={p.value} active={current === p.value} onClick={() => set(p.value)}>
          {p.label}
        </Chip>
      ))}
    </div>
  );
}
