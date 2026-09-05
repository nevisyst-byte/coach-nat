import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fmtDayLabel, fmtPeriodeLabel } from "@/lib/week";

const bodySchema = z
  .object({
    nom: z.string().min(1),
    dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lieu: z.string(),
    groupesLabel: z.string(),
    places: z.number().int().positive(),
    budgetLabel: z.string().optional(),
  })
  .refine((d) => d.dateFin >= d.dateDebut, { message: "La date de fin doit être après la date de début", path: ["dateFin"] });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });

  const { nom, dateDebut, dateFin, lieu, groupesLabel, places, budgetLabel } = parsed.data;
  const debut = new Date(`${dateDebut}T00:00:00`);
  const fin = new Date(`${dateFin}T00:00:00`);
  const nbJours = Math.min(7, Math.round((fin.getTime() - debut.getTime()) / 86400000) + 1);

  const stage = await prisma.stage.create({
    data: {
      nom,
      periodeLabel: fmtPeriodeLabel(debut, fin),
      dateDebut: debut,
      dateFin: fin,
      lieu,
      groupesLabel,
      coachsLabel: "—",
      places,
      budgetLabel,
      jours: {
        create: Array.from({ length: 7 }, (_, i) => {
          if (i >= nbJours) return { jour: i, dateLabel: "" };
          const d = new Date(debut);
          d.setDate(d.getDate() + i);
          return { jour: i, dateLabel: fmtDayLabel(d), date: d };
        }),
      },
    },
  });

  return NextResponse.json({ ok: true, id: stage.id });
}
