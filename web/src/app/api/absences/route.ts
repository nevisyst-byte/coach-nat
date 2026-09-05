import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({
  qui: z.enum(["nageur", "coach"]),
  personneId: z.string().min(1),
  date: z.string().min(1),
  motif: z.string(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { qui, personneId, date, motif } = parsed.data;

  if (qui === "nageur") {
    const absence = await prisma.absence.create({
      data: { nageurId: personneId, date, motif: motif || "Non précisé", statut: "A_TRAITER" },
    });
    return NextResponse.json({ ok: true, id: absence.id });
  }

  const conge = await prisma.conge.create({
    data: { coachId: personneId, periodeLabel: date, motif: motif || "Non précisé", impact: "À évaluer", statut: "EN_ATTENTE" },
  });
  return NextResponse.json({ ok: true, id: conge.id });
}
