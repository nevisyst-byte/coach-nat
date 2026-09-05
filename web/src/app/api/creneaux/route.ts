import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  jour: z.number().int().min(0).max(6),
  debut: z.string(),
  fin: z.string(),
  groupeId: z.string(),
  coachId: z.string().nullable().optional(),
  bassin: z.string(),
  etat: z.enum(["ASSURE", "REMPLACE", "A_COUVRIR"]).default("ASSURE"),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const creneau = await prisma.creneau.create({ data: parsed.data });
  return NextResponse.json({ ok: true, id: creneau.id });
}
