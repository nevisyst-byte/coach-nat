import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachOrAdmin } from "@/lib/auth";
import { buildManualBlocs } from "@/lib/seance-manual";

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

const bodySchema = z.object({
  heureDebut: z.string().min(1),
  sections: z.array(sectionSchema),
});

// Surcharge le contenu d'une occurrence précise (creneauId+date déjà résolus
// par resolveSeanceInstance) — prioritaire sur le plan d'entraînement du
// groupe pour cette seule date, sans toucher au plan ni aux autres créneaux.
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
  const { heureDebut, sections } = parsed.data;

  await prisma.seanceInstance.update({
    where: { id },
    data: { heureDebut, sections, blocs: buildManualBlocs(heureDebut, sections) },
  });
  return NextResponse.json({ ok: true });
}
