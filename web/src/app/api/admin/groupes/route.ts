import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachOrAdmin } from "@/lib/auth";

const bodySchema = z.object({
  nom: z.string().min(1),
  pole: z.enum(["FORMATION", "COMPETITION", "SAUVETAGE", "LOISIR"]),
  categorie: z.string().min(1),
  color: z.string().min(1),
  coachId: z.string().nullable().optional(),
  objectif: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireCoachOrAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const groupe = await prisma.groupe.create({ data: { ...parsed.data, coachId: parsed.data.coachId || null } });
  return NextResponse.json({ ok: true, id: groupe.id });
}
