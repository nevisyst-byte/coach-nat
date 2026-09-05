import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  date: z.string(),
  groupeNom: z.string(),
  variant: z.string(),
  intensite: z.string(),
  nage: z.string(),
  volumeNage: z.number().int(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { date, ...rest } = parsed.data;
  const instance = await prisma.seanceInstance.create({
    data: { ...rest, date: new Date(`${date}T00:00:00`), coachId: session.coachId },
  });

  return NextResponse.json({ ok: true, id: instance.id });
}
