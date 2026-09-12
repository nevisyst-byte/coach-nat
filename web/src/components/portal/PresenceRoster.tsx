"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { initialsColor } from "@/lib/format";

const ETATS: { code: string; value: string; label: string; color: string }[] = [
  { code: "P", value: "PRESENT", label: "Présent", color: "#2ECC8F" },
  { code: "R", value: "RETARD", label: "Retard", color: "#F2B33D" },
  { code: "A", value: "ABSENT", label: "Absent", color: "#E8442B" },
  { code: "E", value: "EXCUSE", label: "Excusé", color: "#8CC4FF" },
];

export type RosterPerson = { nom: string; initiales: string; sousTitre: string; etat: string; nageurId?: string };

// Bascule locale (pas d'appel réseau par clic) : le coach ouvre la séance,
// change 2-3 nageurs, puis valide une fois — voir « Valider la feuille de
// présence » ci-dessous, qui envoie tout en un seul POST /api/presences/bulk.
export function PresenceRoster({ title, people, seanceInstanceId, role }: { title: string; people: RosterPerson[]; seanceInstanceId: string; role: string }) {
  const router = useRouter();
  const [etats, setEtats] = useState<Record<string, string>>(() => Object.fromEntries(people.map((p) => [p.nom, p.etat])));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);

  function choisir(nom: string, etat: string) {
    setEtats((prev) => ({ ...prev, [nom]: etat }));
    setSaved(false);
  }

  async function valider() {
    setSaving(true);
    try {
      await fetch("/api/presences/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seanceInstanceId,
          entries: people.map((p) => ({ nomPersonne: p.nom, nageurId: p.nageurId, role, etat: etats[p.nom] ?? p.etat })),
        }),
      });
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between mb-4 gap-2.5 flex-wrap">
        <h2 className="font-display text-[19px] tracking-[0.06em]">{title}</h2>
        <button
          onClick={valider}
          disabled={saving || people.length === 0}
          className="rounded-[10px] px-4 py-2 text-[13px] font-bold cursor-pointer disabled:cursor-default disabled:opacity-60"
          style={{ background: saved ? "rgba(46,204,143,0.14)" : "linear-gradient(135deg,#1E7BFF,#0F5FD6)", color: saved ? "#2ECC8F" : "#fff", border: saved ? "1px solid rgba(46,204,143,0.35)" : "none" }}
        >
          {saving ? "Enregistrement…" : saved ? "✓ Feuille validée" : "Valider la feuille de présence"}
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {people.length === 0 && (
          <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Aucune personne rattachée à cette séance.
          </div>
        )}
        {people.map((p) => {
          const etat = etats[p.nom] ?? p.etat;
          return (
            <div key={p.nom} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 flex-wrap" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-xs font-bold shrink-0" style={{ background: initialsColor(p.nom) }}>
                {p.initiales}
              </div>
              <div className="flex-1" style={{ minWidth: 110 }}>
                {p.nageurId ? (
                  <Link href={`/nageurs/${p.nageurId}`} className="text-sm font-semibold hover:underline" style={{ color: "var(--ink)" }}>
                    {p.nom}
                  </Link>
                ) : (
                  <div className="text-sm font-semibold">{p.nom}</div>
                )}
                <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                  {p.sousTitre}
                </div>
              </div>
              <div className="flex gap-1.5">
                {ETATS.map((e) => {
                  const on = etat === e.value;
                  return (
                    // Cible et remplissage agrandis (38px → 44px, opacité active
                    // doublée + halo) : à l'ancien style, l'état sélectionné se
                    // distinguait trop peu de l'inactif pour un pointage rapide
                    // au bord du bassin.
                    <button
                      key={e.code}
                      title={e.label}
                      onClick={() => choisir(p.nom, e.value)}
                      className="w-[44px] h-[44px] rounded-[12px] font-display text-[16px] font-bold cursor-pointer"
                      style={{
                        border: `1.5px solid ${on ? e.color : "var(--border-strong)"}`,
                        background: on ? `${e.color}33` : "rgba(255,255,255,0.06)",
                        color: on ? e.color : "var(--ink-body)",
                        boxShadow: on ? `0 0 0 3px ${e.color}22` : undefined,
                      }}
                    >
                      {e.code}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
