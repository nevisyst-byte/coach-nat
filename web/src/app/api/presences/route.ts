import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recalculerPresenceRate } from "@/lib/presence-rate";

const bodySchema = z.object({
  seanceInstanceId: z.string().min(1),
  nomPersonne: z.string().min(1),
  role: z.string(),
  etat: z.enum(["PRESENT", "RETARD", "ABSENT", "EXCUSE"]),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { seanceInstanceId, nomPersonne, role, etat } = parsed.data;
  await prisma.presence.upsert({
    where: { seanceInstanceId_nomPersonne: { seanceInstanceId, nomPersonne } },
    update: { etat, role },
    create: { seanceInstanceId, nomPersonne, role, etat },
  });

  if (role === "SWIMMER") await recalculerPresenceRate(nomPersonne);

  return NextResponse.json({ ok: true });
}
