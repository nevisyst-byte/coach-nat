import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  jour: z.number().int().min(0).max(6).optional(),
  debut: z.string().optional(),
  fin: z.string().optional(),
  categorie: z.enum(["REUNION", "FORUM", "AUTRE"]).optional(),
  titre: z.string().min(1).optional(),
  lieu: z.string().nullable().optional(),
  coachId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  await prisma.evenementSemaine.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  await prisma.evenementSemaine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
