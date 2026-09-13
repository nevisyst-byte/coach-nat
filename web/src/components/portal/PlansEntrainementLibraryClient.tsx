"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { couleurObjectif } from "@/lib/objectifs";
import { Button } from "@/components/ui/Button";
import { PlanModal, type Plan, type Section, type CreneauLite, type PlanModalOpen } from "./PlanModal";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

// Bibliothèque des plans d'entraînement déjà créés (1 ou plusieurs
// semaines) — jamais une séance unitaire, qui a sa propre bibliothèque à
// côté. On rouvre ici le même formulaire que sur le calendrier des plans :
// duplication sur une nouvelle période et suppression sont déjà dedans.
export function PlansEntrainementLibraryClient({
  plans,
  groupesParPole,
  creneauxParGroupe,
}: {
  plans: Plan[];
  groupesParPole: Section[];
  creneauxParGroupe: Record<string, CreneauLite[]>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<PlanModalOpen | null>(null);
  const plansTries = [...plans].sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));

  return (
    <div className="flex flex-col gap-4">
      {plansTries.length === 0 ? (
        <div className="rounded-2xl py-10 text-center text-[14px] font-semibold" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-secondary)" }}>
          Aucun plan pour l&apos;instant — crée-en un depuis Plan d&apos;entraînement ou Calendrier des plans.
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
          {plansTries.map((p) => (
            <div key={p.id} className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ border: "1px solid var(--border)", borderLeft: `4px solid ${couleurObjectif(p.theme)}` }}>
              <div>
                <div className="text-sm font-semibold truncate">{p.nom}</div>
                <div className="text-[13px] mt-0.5" style={{ color: couleurObjectif(p.theme) }}>
                  {p.theme}
                </div>
              </div>
              <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                {fmtDate(p.dateDebut)} → {fmtDate(p.dateFin)}
              </div>
              <div className="text-[12px] truncate" style={{ color: "var(--ink-tertiary)" }}>
                {p.groupes.map((g) => g.nom).join(", ") || "Aucun groupe"}
              </div>
              <Button variant="secondary" size="sm" className="mt-1.5" onClick={() => setOpen({ mode: "edit", plan: p })}>
                ✎ Modifier
              </Button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <PlanModal open={open} onClose={() => setOpen(null)} groupesParPole={groupesParPole} creneauxParGroupe={creneauxParGroupe} plans={plans} onSaved={() => router.refresh()} />
      )}
    </div>
  );
}
