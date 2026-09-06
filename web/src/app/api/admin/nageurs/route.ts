import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { upsertInscriptionActive } from "@/lib/saison";

const bodySchema = z.object({
  nom: z.string().min(1),
  age: z.number().int().positive(),
  categorie: z.string().min(1),
  specialite: z.string().min(1),
  groupeId: z.string().nullable().optional(),
  membreDepuis: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const initiales = parsed.data.nom
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const nageur = await prisma.nageur.create({
    data: {
      ...parsed.data,
      initiales,
      groupeId: parsed.data.groupeId || null,
      membreDepuis: parsed.data.membreDepuis ? new Date(parsed.data.membreDepuis) : null,
    },
  });
  await upsertInscriptionActive(nageur.id, nageur.groupeId);
  return NextResponse.json({ ok: true, id: nageur.id });
}
