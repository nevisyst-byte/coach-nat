import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  nom: z.string().min(1),
  periodeLabel: z.string(),
  lieu: z.string(),
  groupesLabel: z.string(),
  places: z.number().int().positive(),
  budgetLabel: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const stage = await prisma.stage.create({
    data: {
      ...parsed.data,
      coachsLabel: "—",
      jours: { create: Array.from({ length: 7 }, (_, i) => ({ jour: i, dateLabel: i < 5 ? `J${i + 1}` : "" })) },
    },
  });

  return NextResponse.json({ ok: true, id: stage.id });
}
