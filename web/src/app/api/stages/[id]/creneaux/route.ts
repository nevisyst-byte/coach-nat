import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  jour: z.number().int().min(0).max(6),
  debut: z.string(),
  fin: z.string(),
  type: z.enum(["EAU", "PHYSIQUE", "VIDEO", "RECUP"]),
  groupe: z.string(),
  coachId: z.string().nullable().optional(),
  bassin: z.string(),
  theme: z.string(),
  volume: z.number().int().min(0),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const creneau = await prisma.creneauStage.create({ data: { ...parsed.data, stageId: id } });
  return NextResponse.json({ ok: true, id: creneau.id });
}
