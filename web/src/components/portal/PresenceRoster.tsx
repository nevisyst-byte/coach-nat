"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { initialsColor } from "@/lib/format";

const ETATS: { code: string; value: string; label: string; color: string; bg: string }[] = [
  { code: "P", value: "PRESENT", label: "Présent", color: "#2ECC8F", bg: "rgba(46,204,143,0.16)" },
  { code: "R", value: "RETARD", label: "Retard", color: "#F2B33D", bg: "rgba(242,179,61,0.16)" },
  { code: "A", value: "ABSENT", label: "Absent", color: "#E8442B", bg: "rgba(232,68,43,0.16)" },
  { code: "E", value: "EXCUSE", label: "Excusé", color: "#8CC4FF", bg: "rgba(30,123,255,0.16)" },
];

export type RosterPerson = { nom: string; initiales: string; sousTitre: string; etat: string };

export function PresenceRoster({ title, people, contextKey, role }: { title: string; people: RosterPerson[]; contextKey: string; role: string }) {
  const router = useRouter();

  async function setEtat(nom: string, etat: string) {
    await fetch("/api/presences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contextKey, nomPersonne: nom, role, etat }),
    });
    router.refresh();
  }

  return (
    <Card>
      <h2 className="font-display text-[19px] tracking-[0.06em] mb-4">{title}</h2>
      <div className="flex flex-col gap-2.5">
        {people.length === 0 && (
          <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Aucune personne rattachée à cette séance.
          </div>
        )}
        {people.map((p) => (
          <div key={p.nom} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 flex-wrap" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-xs font-bold shrink-0" style={{ background: initialsColor(p.nom) }}>
              {p.initiales}
            </div>
            <div className="flex-1" style={{ minWidth: 110 }}>
              <div className="text-sm font-semibold">{p.nom}</div>
              <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                {p.sousTitre}
              </div>
            </div>
            <div className="flex gap-1.5">
              {ETATS.map((e) => {
                const on = p.etat === e.value;
                return (
                  <button
                    key={e.code}
                    title={e.label}
                    onClick={() => setEtat(p.nom, e.value)}
                    className="w-[38px] h-[38px] rounded-[10px] font-display text-[15px] cursor-pointer"
                    style={{ border: `1px solid ${on ? e.color : "var(--border-strong)"}`, background: on ? e.bg : "rgba(255,255,255,0.04)", color: on ? e.color : "var(--ink-secondary)" }}
                  >
                    {e.code}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
