import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachOrAdmin } from "@/lib/auth";

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
const valeurPourcentageSchema = z.object({ valeur: z.string().min(1), pourcentage: z.number().min(0).max(100) });
const comboSchema = z.object({
  variant: z.array(valeurPourcentageSchema).min(1),
  intensite: z.array(valeurPourcentageSchema).min(1),
  nage: z.array(valeurPourcentageSchema).min(1),
  pourcentage: z.number().min(0).max(100),
});

const bodySchema = z.object({
  nom: z.string().min(1),
  theme: z.string().min(1),
  heureDebut: z.string().optional(),
  combos: z.array(comboSchema).optional(),
  volumeNage: z.number().int().optional(),
  sections: z.array(sectionSchema).optional(),
});

// Modèle de séance réutilisable — capture le contenu (combos ou sections
// manuelles) d'un plan pour le réappliquer plus tard à une autre date ou un
// autre créneau, sans dates ni groupes (ceux-ci restent propres à chaque
// plan d'entraînement qui charge le modèle).
export async function GET() {
  try {
    await requireCoachOrAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const modeles = await prisma.modeleSeance.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ modeles });
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
  const { nom, theme, heureDebut, combos, volumeNage, sections } = parsed.data;

  const modele = await prisma.modeleSeance.create({
    data: {
      nom,
      theme,
      heureDebut: heureDebut || null,
      combos: combos && combos.length > 0 ? combos : undefined,
      volumeNage: volumeNage ?? null,
      sections: sections ?? undefined,
    },
  });
  return NextResponse.json({ ok: true, id: modele.id });
}
