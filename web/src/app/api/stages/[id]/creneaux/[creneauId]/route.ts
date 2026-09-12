import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

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
const comboSchema = z.object({
  variant: z.array(z.string()).min(1),
  intensite: z.array(z.string()).min(1),
  nage: z.array(z.object({ valeur: z.string().min(1), pourcentage: z.number().min(0).max(100) })).min(1),
  pourcentage: z.number().min(0).max(100),
});

const bodySchema = z.object({
  jour: z.number().int().min(0).max(6).optional(),
  debut: z.string().optional(),
  fin: z.string().optional(),
  type: z.enum(["EAU", "PHYSIQUE", "VIDEO", "RECUP"]).optional(),
  groupe: z.string().optional(),
  coachId: z.string().nullable().optional(),
  bassin: z.string().optional(),
  theme: z.string().optional(),
  volume: z.number().int().min(0).optional(),
  combos: z.array(comboSchema).nullable().optional(),
  sections: z.array(sectionSchema).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; creneauId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { creneauId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const { combos, sections, ...rest } = parsed.data;
  const comboUnique = combos && combos.length === 1 ? combos[0] : null;

  await prisma.creneauStage.update({
    where: { id: creneauId },
    data: {
      ...rest,
      ...(comboUnique ? { variant: comboUnique.variant.join(" + "), intensite: comboUnique.intensite.join(" + "), nage: comboUnique.nage.join(" + ") } : combos !== undefined ? { variant: null, intensite: null, nage: null } : {}),
      ...(combos !== undefined ? { combos: combos === null || combos.length === 0 ? Prisma.JsonNull : combos } : {}),
      ...(sections !== undefined ? { sections: sections === null ? Prisma.JsonNull : sections } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; creneauId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { creneauId } = await params;
  await prisma.creneauStage.delete({ where: { id: creneauId } });
  return NextResponse.json({ ok: true });
}
