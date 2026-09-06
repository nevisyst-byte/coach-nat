import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { upsertInscriptionActive } from "@/lib/saison";

const bodySchema = z.object({
  nom: z.string().min(1),
  // Année de naissance plutôt qu'un âge en dur (qui se périme chaque année) —
  // l'âge stocké est recalculé à partir de celle-ci. `age` reste accepté en
  // repli direct pour compatibilité.
  anneeNaissance: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  age: z.number().int().positive().optional(),
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
  const { anneeNaissance, age, ...rest } = parsed.data;

  const initiales = parsed.data.nom
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const nageur = await prisma.nageur.create({
    data: {
      ...rest,
      age: anneeNaissance ? new Date().getFullYear() - anneeNaissance : (age ?? 14),
      anneeNaissance,
      initiales,
      groupeId: parsed.data.groupeId || null,
      membreDepuis: parsed.data.membreDepuis ? new Date(parsed.data.membreDepuis) : null,
    },
  });
  await upsertInscriptionActive(nageur.id, nageur.groupeId);
  return NextResponse.json({ ok: true, id: nageur.id });
}
