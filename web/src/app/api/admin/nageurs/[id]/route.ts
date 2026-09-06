import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { upsertInscriptionActive } from "@/lib/saison";

const bodySchema = z.object({
  nom: z.string().min(1).optional(),
  anneeNaissance: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  age: z.number().int().positive().optional(),
  categorie: z.string().min(1).optional(),
  specialite: z.string().nullable().optional(),
  groupeId: z.string().nullable().optional(),
  pointsFFN: z.number().int().optional(),
  rangDept: z.number().int().nullable().optional(),
  rangReg: z.number().int().nullable().optional(),
  rangNat: z.number().int().nullable().optional(),
  presenceRate: z.number().int().optional(),
  membreDepuis: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { membreDepuis, anneeNaissance, ...rest } = parsed.data;
  const nageur = await prisma.nageur.update({
    where: { id },
    data: {
      ...rest,
      ...(anneeNaissance !== undefined ? { anneeNaissance, age: new Date().getFullYear() - anneeNaissance } : {}),
      ...(membreDepuis !== undefined ? { membreDepuis: membreDepuis ? new Date(membreDepuis) : null } : {}),
    },
  });
  if ("groupeId" in parsed.data) await upsertInscriptionActive(id, nageur.groupeId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.nageur.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
