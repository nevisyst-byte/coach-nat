import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachOrAdmin } from "@/lib/auth";

const bodySchema = z.object({
  date: z.string(),
  titre: z.string().min(1),
  detail: z.string(),
  color: z.string(),
});

export async function POST(request: Request) {
  try {
    await requireCoachOrAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const echeance = await prisma.echeance.create({ data: { ...parsed.data, date: new Date(parsed.data.date) } });
  return NextResponse.json({ ok: true, id: echeance.id });
}
