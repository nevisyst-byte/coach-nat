import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const bodySchema = z.object({
  nageurIds: z.array(z.string()),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const groupe = await prisma.groupe.findUnique({ where: { id } });
  if (!groupe) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { nageurIds } = parsed.data;

  await prisma.$transaction([
    prisma.nageur.updateMany({ where: { groupeId: id, id: { notIn: nageurIds } }, data: { groupeId: null } }),
    prisma.nageur.updateMany({ where: { id: { in: nageurIds } }, data: { groupeId: id } }),
  ]);

  return NextResponse.json({ ok: true });
}
