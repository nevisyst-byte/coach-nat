import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recalculerPresenceRate } from "@/lib/presence-rate";

const entrySchema = z.object({
  nomPersonne: z.string().min(1),
  nageurId: z.string().min(1).optional(),
  role: z.string(),
  etat: z.enum(["PRESENT", "RETARD", "ABSENT", "EXCUSE"]),
});
const bodySchema = z.object({
  seanceInstanceId: z.string().min(1),
  entries: z.array(entrySchema).min(1),
});

// Persiste en un coup toute la feuille de présence d'une séance (le bouton
// « Valider la feuille de présence ») plutôt qu'un upsert par personne —
// c'est le flux normal : le coach bascule 2-3 nageurs puis valide une fois,
// pas un aller-retour réseau par nageur.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { seanceInstanceId, entries } = parsed.data;

  await prisma.$transaction(
    entries.map((e) =>
      prisma.presence.upsert({
        where: { seanceInstanceId_nomPersonne: { seanceInstanceId, nomPersonne: e.nomPersonne } },
        update: { etat: e.etat, role: e.role, nageurId: e.nageurId ?? null },
        create: { seanceInstanceId, nomPersonne: e.nomPersonne, nageurId: e.nageurId, role: e.role, etat: e.etat },
      })
    )
  );

  const swimmers = new Map(entries.filter((e) => e.role === "SWIMMER" && e.nageurId).map((e) => [e.nageurId!, e.nomPersonne]));
  for (const [nageurId, nomPersonne] of swimmers) {
    await recalculerPresenceRate(nageurId, nomPersonne);
  }

  return NextResponse.json({ ok: true });
}
