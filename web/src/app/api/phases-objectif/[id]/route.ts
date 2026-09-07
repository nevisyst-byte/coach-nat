import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachOrAdmin } from "@/lib/auth";

const bodySchema = z.object({
  theme: z.string().min(1).optional(),
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dureeSemaines: z.number().int().min(1).optional(),
});

function dateFinDe(dateDebut: string, dureeSemaines: number) {
  const debut = new Date(`${dateDebut}T00:00:00`);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + dureeSemaines * 7 - 1);
  return fin;
}

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
  const { theme, dateDebut, dureeSemaines } = parsed.data;

  if (dateDebut !== undefined && dureeSemaines !== undefined) {
    await prisma.phaseObjectif.update({ where: { id }, data: { theme, dateDebut: new Date(`${dateDebut}T00:00:00`), dateFin: dateFinDe(dateDebut, dureeSemaines) } });
  } else if (theme !== undefined) {
    await prisma.phaseObjectif.update({ where: { id }, data: { theme } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCoachOrAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.phaseObjectif.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
