"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Card";
import { ModelesSeanceClient } from "./ModelesSeanceClient";
import { PlansEntrainementLibraryClient } from "./PlansEntrainementLibraryClient";
import type { Modele } from "./SeanceContenuEditor";
import type { Plan, Section, CreneauLite } from "./PlanModal";

// Deux bibliothèques bien séparées : un plan d'entraînement (1 ou
// plusieurs semaines) et une séance (le contenu d'une seule journée) sont
// deux types distincts qui ne se substituent jamais l'un à l'autre — donc
// deux onglets, jamais une liste mélangée ni un chargement croisé.
export function BibliothequeClient({
  modeles,
  plans,
  groupesParPole,
  creneauxParGroupe,
}: {
  modeles: Modele[];
  plans: Plan[];
  groupesParPole: Section[];
  creneauxParGroupe: Record<string, CreneauLite[]>;
}) {
  const [onglet, setOnglet] = useState<"plans" | "seances">("plans");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Chip active={onglet === "plans"} onClick={() => setOnglet("plans")}>
          Plans d&apos;entraînement
        </Chip>
        <Chip active={onglet === "seances"} onClick={() => setOnglet("seances")}>
          Séances
        </Chip>
      </div>

      {onglet === "plans" ? (
        <PlansEntrainementLibraryClient plans={plans} groupesParPole={groupesParPole} creneauxParGroupe={creneauxParGroupe} />
      ) : (
        <ModelesSeanceClient modeles={modeles} />
      )}
    </div>
  );
}
