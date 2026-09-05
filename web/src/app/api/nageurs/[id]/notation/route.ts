import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Nage } from "@/generated/prisma/client";

const bodySchema = z.object({
  nage: z.enum(["PAPILLON", "DOS", "BRASSE", "CRAWL"]),
  notes: z.record(z.string(), z.number().int().min(1).max(5)),
  observation: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { nage, notes, observation } = parsed.data;
  await prisma.notationTechnique.createMany({
    data: Object.entries(notes).map(([critere, note]) => ({
      nageurId: id,
      nage: nage as Nage,
      critere,
      note,
      observation: observation || null,
      coachId: session.coachId,
    })),
  });

  return NextResponse.json({ ok: true });
}
