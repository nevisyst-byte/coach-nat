import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachOrAdmin } from "@/lib/auth";

const bodySchema = z.object({
  groupeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sectionId: z.string().min(1),
  pourcentage: z.number().int(),
});

// pourcentage à 0 supprime l'ajustement (retour au contenu du plan tel quel)
// plutôt que de stocker un ajustement neutre.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCoachOrAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id: planId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const { groupeId, date, sectionId, pourcentage } = parsed.data;
  const dateObj = new Date(`${date}T00:00:00`);

  if (pourcentage === 0) {
    await prisma.ajustementPlan.deleteMany({ where: { planId, groupeId, date: dateObj, sectionId } });
    return NextResponse.json({ ok: true });
  }

  await prisma.ajustementPlan.upsert({
    where: { planId_groupeId_date_sectionId: { planId, groupeId, date: dateObj, sectionId } },
    update: { pourcentage },
    create: { planId, groupeId, date: dateObj, sectionId, pourcentage },
  });
  return NextResponse.json({ ok: true });
}
