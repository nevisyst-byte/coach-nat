import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

const bodySchema = z.object({
  theme: z.string(),
  variant: z.string(),
  nage: z.string(),
  objectif: z.string(),
  groupeNom: z.string(),
  dureeSemaines: z.number().int(),
  seances: z.array(z.record(z.string(), z.unknown())),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const cycle = await prisma.cycleThematique.create({
    data: { ...parsed.data, seances: parsed.data.seances as Prisma.InputJsonValue[] },
  });
  return NextResponse.json({ ok: true, id: cycle.id });
}
