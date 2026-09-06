import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifierEcheanceAVenir } from "@/lib/notifications";

// Rappel mail avant une échéance de saison (compétition, réunion, forum...).
// Pensé pour être appelé une fois par jour par une tâche cron externe (le
// serveur Next.js self-hosted n'a pas de scheduler intégré) — voir DEPLOY.md.
// Protégé par un secret partagé plutôt qu'une session, puisqu'il n'y a pas
// d'utilisateur connecté lors d'un appel cron.
const JOURS_AVANT = 2;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const now = new Date();
  const limite = new Date(now.getTime() + JOURS_AVANT * 24 * 60 * 60 * 1000);

  const echeances = await prisma.echeance.findMany({
    where: { rappelEnvoye: false, date: { gte: now, lte: limite } },
  });

  for (const echeance of echeances) {
    await notifierEcheanceAVenir({ titre: echeance.titre, detail: echeance.detail, date: echeance.date });
    await prisma.echeance.update({ where: { id: echeance.id }, data: { rappelEnvoye: true } });
  }

  return NextResponse.json({ ok: true, envoyes: echeances.length });
}
