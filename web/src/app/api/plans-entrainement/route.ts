import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachOrAdmin } from "@/lib/auth";

const setSchema = z.object({
  id: z.string(),
  reps: z.number().int().min(1),
  distance: z.number().int().min(1),
  label: z.string(),
  allure: z.string(),
  repos: z.string(),
  nages: z.array(z.string()).default([]),
});
const sectionSchema = z.object({ id: z.string(), nom: z.string(), objectif: z.string(), sets: z.array(setSchema) });
const comboSchema = z.object({ variant: z.string(), intensite: z.string(), nage: z.string(), pourcentage: z.number().min(0).max(100) });

const bodySchema = z.object({
  nom: z.string().min(1),
  theme: z.string().min(1),
  heureDebut: z.string().optional(),
  variant: z.string().optional(),
  intensite: z.string().optional(),
  nage: z.string().optional(),
  volumeNage: z.number().int().optional(),
  combos: z.array(comboSchema).optional(),
  sections: z.array(sectionSchema).optional(),
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dureeSemaines: z.number().int().min(1),
  groupeIds: z.array(z.string()).min(1),
});

export function dateFinDe(dateDebut: string, dureeSemaines: number) {
  const debut = new Date(`${dateDebut}T00:00:00`);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + dureeSemaines * 7 - 1);
  return fin;
}

export async function POST(request: Request) {
  try {
    await requireCoachOrAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const { nom, theme, heureDebut, variant, intensite, nage, volumeNage, combos, sections, dateDebut, dureeSemaines, groupeIds } = parsed.data;

  // variant/intensite/nage restent renseignés quand il n'y a qu'une seule
  // répartition (une ligne dans combos, ou l'ancien formulaire à une seule
  // ligne) — code plus ancien (affichage, seance-generator à un combo) qui
  // lit encore ces 3 champs directement.
  const comboUnique = combos && combos.length === 1 ? combos[0] : null;

  const plan = await prisma.planEntrainement.create({
    data: {
      nom,
      theme,
      heureDebut: heureDebut || null,
      variant: comboUnique?.variant ?? variant ?? null,
      intensite: comboUnique?.intensite ?? intensite ?? null,
      nage: comboUnique?.nage ?? nage ?? null,
      volumeNage: volumeNage ?? null,
      combos: combos && combos.length > 0 ? combos : undefined,
      sections: sections ?? undefined,
      dateDebut: new Date(`${dateDebut}T00:00:00`),
      dateFin: dateFinDe(dateDebut, dureeSemaines),
      groupes: { connect: groupeIds.map((id) => ({ id })) },
    },
  });
  return NextResponse.json({ ok: true, id: plan.id });
}
