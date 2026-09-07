import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  nom: z.string().min(1).optional(),
  groupeNom: z.string().optional(),
  variant: z.string().optional(),
  intensite: z.string().optional(),
  nage: z.string().optional(),
  volumeCible: z.number().int().optional(),
  blocs: z.array(z.object({ phase: z.string(), distance: z.string(), contenu: z.string(), consigne: z.string(), objectif: z.string().optional() })).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  await prisma.seancePlan.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  await prisma.seancePlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
