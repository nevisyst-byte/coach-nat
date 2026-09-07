import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachOrAdmin } from "@/lib/auth";

const bodySchema = z.object({
  groupeId: z.string().min(1),
  theme: z.string().min(1),
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dureeSemaines: z.number().int().min(1),
});

function dateFinDe(dateDebut: string, dureeSemaines: number) {
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

  const { groupeId, theme, dateDebut, dureeSemaines } = parsed.data;
  const phase = await prisma.phaseObjectif.create({
    data: { groupeId, theme, dateDebut: new Date(`${dateDebut}T00:00:00`), dateFin: dateFinDe(dateDebut, dureeSemaines) },
  });
  return NextResponse.json({ ok: true, id: phase.id });
}
