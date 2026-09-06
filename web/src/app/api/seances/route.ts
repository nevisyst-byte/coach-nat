import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  nom: z.string().min(1),
  groupeNom: z.string(),
  variant: z.string(),
  intensite: z.string(),
  nage: z.string(),
  volumeCible: z.number().int(),
  blocs: z.array(z.object({ phase: z.string(), distance: z.string(), contenu: z.string(), consigne: z.string() })),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const seances = await prisma.seancePlan.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ seances });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const seance = await prisma.seancePlan.create({ data: parsed.data });
  return NextResponse.json({ ok: true, id: seance.id });
}
