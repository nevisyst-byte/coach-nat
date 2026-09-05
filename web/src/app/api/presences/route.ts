import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  contextKey: z.string().min(1),
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

  const { contextKey, nomPersonne, role, etat } = parsed.data;
  await prisma.presence.upsert({
    where: { contextKey_nomPersonne: { contextKey, nomPersonne } },
    update: { etat, role },
    create: { contextKey, nomPersonne, role, etat },
  });

  return NextResponse.json({ ok: true });
}
