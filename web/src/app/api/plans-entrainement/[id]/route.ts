import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachOrAdmin } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { dateFinDe } from "../route";

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
  nage: z.array(z.string()).min(1),
  pourcentage: z.number().min(0).max(100),
});

const bodySchema = z.object({
  nom: z.string().min(1).optional(),
  theme: z.string().min(1).optional(),
  heureDebut: z.string().nullable().optional(),
  variant: z.string().nullable().optional(),
  intensite: z.string().nullable().optional(),
  nage: z.string().nullable().optional(),
  volumeNage: z.number().int().nullable().optional(),
  combos: z.array(comboSchema).nullable().optional(),
  sections: z.array(sectionSchema).nullable().optional(),
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dureeSemaines: z.number().int().min(1).optional(),
  groupeIds: z.array(z.string()).min(1).optional(),
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
  const { nom, theme, heureDebut, variant, intensite, nage, volumeNage, combos, sections, dateDebut, dureeSemaines, groupeIds } = parsed.data;
  const comboUnique = combos && combos.length === 1 ? combos[0] : null;

  await prisma.planEntrainement.update({
    where: { id },
    data: {
      ...(nom !== undefined ? { nom } : {}),
      ...(theme !== undefined ? { theme } : {}),
      ...(heureDebut !== undefined ? { heureDebut } : {}),
      ...(comboUnique ? { variant: comboUnique.variant.join(" + "), intensite: comboUnique.intensite.join(" + "), nage: comboUnique.nage.join(" + ") } : variant !== undefined ? { variant } : {}),
      ...(!comboUnique && intensite !== undefined ? { intensite } : {}),
      ...(!comboUnique && nage !== undefined ? { nage } : {}),
      ...(volumeNage !== undefined ? { volumeNage } : {}),
      ...(combos !== undefined ? { combos: combos === null || combos.length === 0 ? Prisma.JsonNull : combos } : {}),
      ...(sections !== undefined ? { sections: sections === null ? Prisma.JsonNull : sections } : {}),
      ...(dateDebut !== undefined && dureeSemaines !== undefined ? { dateDebut: new Date(`${dateDebut}T00:00:00`), dateFin: dateFinDe(dateDebut, dureeSemaines) } : {}),
      ...(groupeIds !== undefined ? { groupes: { set: groupeIds.map((gid) => ({ id: gid })) } } : {}),
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
  await prisma.planEntrainement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
