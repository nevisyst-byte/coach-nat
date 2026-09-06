import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { setActiveSaison } from "@/lib/saison";

const bodySchema = z.object({
  label: z.string().min(4),
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activer: z.boolean().default(false),
  resetDonnees: z.boolean().default(false),
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
  const { label, dateDebut, dateFin, activer, resetDonnees } = parsed.data;

  const saison = await prisma.saison.create({
    data: { label, dateDebut: new Date(dateDebut), dateFin: new Date(dateFin) },
  });

  if (activer || resetDonnees) await setActiveSaison(saison.id);

  // Repart de zéro sur le roster et les créneaux pour la nouvelle saison —
  // mais garde les groupes (structure stable du club d'une saison à
  // l'autre : nom, pôle, couleur, coach responsable). Les séances/présences
  // déjà pointées (SeanceInstance/Presence) ne sont pas concernées non plus,
  // elles restent comme trace de l'historique passé.
  if (resetDonnees) {
    await prisma.$transaction([
      prisma.creneau.deleteMany(),
      prisma.stage.deleteMany(),
      prisma.nageur.deleteMany(),
    ]);
  }

  return NextResponse.json({ ok: true, id: saison.id });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const saisons = await prisma.saison.findMany({ orderBy: { dateDebut: "desc" } });
  return NextResponse.json({ saisons });
}
