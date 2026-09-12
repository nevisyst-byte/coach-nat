import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
  jour: z.number().int().min(0).max(6),
  debut: z.string(),
  fin: z.string(),
  type: z.enum(["EAU", "PHYSIQUE", "VIDEO", "RECUP"]),
  groupe: z.string(),
  coachId: z.string().nullable().optional(),
  bassin: z.string(),
  theme: z.string(),
  volume: z.number().int().min(0),
  combos: z.array(comboSchema).optional(),
  sections: z.array(sectionSchema).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const { combos, sections, ...rest } = parsed.data;
  const comboUnique = combos && combos.length === 1 ? combos[0] : null;

  const creneau = await prisma.creneauStage.create({
    data: {
      ...rest,
      stageId: id,
      variant: comboUnique?.variant ?? null,
      intensite: comboUnique?.intensite ?? null,
      nage: comboUnique?.nage ?? null,
      combos: combos && combos.length > 0 ? combos : undefined,
      sections: sections ?? undefined,
    },
  });
  return NextResponse.json({ ok: true, id: creneau.id });
}
