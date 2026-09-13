"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { couleurObjectif } from "@/lib/objectifs";
import { volumeTotalManuel, fmtDistance } from "@/lib/seance-manual";
import { Button } from "@/components/ui/Button";
import { ModeleModal, type ModeleModalOpen } from "./ModeleModal";
import type { Modele } from "./SeanceContenuEditor";

// Bibliothèque de séances que le coach gère lui-même : une séance déjà
// construite (variant/intensité/nage ou saisie manuelle) peut être
// enregistrée ici depuis n'importe quel plan, créneau de stage ou séance
// ponctuelle, puis rechargée plus tard — sans avoir à la reconstruire à
// chaque fois qu'un groupe a besoin exactement du même contenu.
export function ModelesSeanceClient({ modeles }: { modeles: Modele[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<ModeleModalOpen | null>(null);
  const [confirmSuppr, setConfirmSuppr] = useState<string | null>(null);

  async function supprimer(id: string) {
    await fetch(`/api/modeles-seance/${id}`, { method: "DELETE" });
    setConfirmSuppr(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="primary" className="self-start" onClick={() => setOpen({ mode: "new" })}>
        + Nouveau modèle
      </Button>

      {modeles.length === 0 ? (
        <div className="rounded-2xl py-10 text-center text-[14px] font-semibold" style={{ border: "1px dashed var(--border-strong)", color: "var(--ink-secondary)" }}>
          Aucun modèle pour l&apos;instant.
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
          {modeles.map((m) => {
            const aSections = !!m.sections && m.sections.length > 0;
            const volume = aSections ? volumeTotalManuel(m.sections!) : m.volumeNage ?? 0;
            return (
              <div key={m.id} className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ border: "1px solid var(--border)", borderLeft: `4px solid ${couleurObjectif(m.theme)}` }}>
                <div>
                  <div className="text-sm font-semibold truncate">{m.nom}</div>
                  <div className="text-[13px] mt-0.5" style={{ color: couleurObjectif(m.theme) }}>
                    {m.theme}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                  <span>{m.heureDebut ?? "—"}</span>
                  <span>·</span>
                  <span>{fmtDistance(volume)}</span>
                  <span>·</span>
                  <span>{aSections ? "Saisie manuelle" : "Variant · Intensité · Nage"}</span>
                </div>
                <div className="flex gap-2 mt-1.5">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => setOpen({ mode: "edit", modele: m })}>
                    ✎ Modifier
                  </Button>
                  {confirmSuppr === m.id ? (
                    <Button variant="danger" size="sm" onClick={() => supprimer(m.id)}>
                      Confirmer ?
                    </Button>
                  ) : (
                    <Button variant="danger" size="sm" onClick={() => setConfirmSuppr(m.id)}>
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && <ModeleModal open={open} onClose={() => setOpen(null)} onSaved={() => setOpen(null)} />}
    </div>
  );
}
