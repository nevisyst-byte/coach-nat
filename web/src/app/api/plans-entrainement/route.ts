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
});
const sectionSchema = z.object({ id: z.string(), nom: z.string(), objectif: z.string(), sets: z.array(setSchema) });

const bodySchema = z.object({
  nom: z.string().min(1),
  heureDebut: z.string().optional(),
  sections: z.array(sectionSchema).min(1),
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
  const { nom, heureDebut, sections, dateDebut, dureeSemaines, groupeIds } = parsed.data;

  const plan = await prisma.planEntrainement.create({
    data: {
      nom,
      heureDebut: heureDebut || null,
      sections,
      dateDebut: new Date(`${dateDebut}T00:00:00`),
      dateFin: dateFinDe(dateDebut, dureeSemaines),
      groupes: { connect: groupeIds.map((id) => ({ id })) },
    },
  });
  return NextResponse.json({ ok: true, id: plan.id });
}
