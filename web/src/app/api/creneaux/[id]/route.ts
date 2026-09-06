import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  actifHorsVacances: z.boolean().optional(),
  // Sous-ensemble explicite du groupe attendu à ce créneau. null = revient
  // au comportement par défaut (tout le groupe). Absent = pas touché.
  nageurIds: z.array(z.string()).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const { actifHorsVacances, nageurIds } = parsed.data;

  if (actifHorsVacances !== undefined) {
    await prisma.creneau.update({ where: { id }, data: { actifHorsVacances } });
  }

  if (nageurIds !== undefined) {
    await prisma.$transaction([
      prisma.creneauNageur.deleteMany({ where: { creneauId: id } }),
      ...(nageurIds && nageurIds.length > 0
        ? [prisma.creneauNageur.createMany({ data: nageurIds.map((nageurId) => ({ creneauId: id, nageurId })) })]
        : []),
    ]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  await prisma.creneau.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
