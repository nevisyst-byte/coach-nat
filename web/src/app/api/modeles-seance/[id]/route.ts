import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachOrAdmin } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

const valeurPourcentageSchema = z.object({ valeur: z.string().min(1), pourcentage: z.number().min(0).max(100) });
const setSchema = z.object({
  id: z.string(),
  reps: z.number().int().min(1),
  distance: z.number().int().min(1),
  label: z.string(),
  allure: z.string(),
  repos: z.string(),
  nages: z.array(valeurPourcentageSchema).default([]),
});
const sectionSchema = z.object({ id: z.string(), nom: z.string(), objectif: z.string(), sets: z.array(setSchema) });
const comboSchema = z.object({
  variant: z.array(valeurPourcentageSchema).min(1),
  intensite: z.array(valeurPourcentageSchema).min(1),
  nage: z.array(valeurPourcentageSchema).min(1),
  pourcentage: z.number().min(0).max(100),
});

const bodySchema = z.object({
  nom: z.string().min(1).optional(),
  theme: z.string().min(1).optional(),
  heureDebut: z.string().nullable().optional(),
  combos: z.array(comboSchema).nullable().optional(),
  volumeNage: z.number().int().nullable().optional(),
  sections: z.array(sectionSchema).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCoachOrAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const { nom, theme, heureDebut, combos, volumeNage, sections } = parsed.data;

  await prisma.modeleSeance.update({
    where: { id },
    data: {
      ...(nom !== undefined ? { nom } : {}),
      ...(theme !== undefined ? { theme } : {}),
      ...(heureDebut !== undefined ? { heureDebut } : {}),
      ...(combos !== undefined ? { combos: combos === null || combos.length === 0 ? Prisma.JsonNull : combos } : {}),
      ...(volumeNage !== undefined ? { volumeNage } : {}),
      ...(sections !== undefined ? { sections: sections === null || sections.length === 0 ? Prisma.JsonNull : sections } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCoachOrAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.modeleSeance.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
