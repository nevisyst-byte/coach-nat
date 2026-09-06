import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  jour: z.number().int().min(0).max(6),
  debut: z.string(),
  fin: z.string(),
  categorie: z.enum(["REUNION", "FORUM", "AUTRE"]).default("AUTRE"),
  titre: z.string().min(1),
  lieu: z.string().nullable().optional(),
  coachId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const evenement = await prisma.evenementSemaine.create({ data: parsed.data });
  return NextResponse.json({ ok: true, id: evenement.id });
}
