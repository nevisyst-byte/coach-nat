import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { searchFfnIndividus, fetchFfnPerformances } from "@/lib/ffn";
import { getActiveSaison } from "@/lib/saison";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const results = await searchFfnIndividus(q);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Recherche FFN indisponible" }, { status: 502 });
  }
}

const bodySchema = z.object({ iuf: z.string().min(1).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const nageur = await prisma.nageur.findUnique({ where: { id } });
  if (!nageur) return NextResponse.json({ error: "Nageur introuvable" }, { status: 404 });

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const iuf = parsed.data.iuf ?? nageur.ffnIuf;
  if (!iuf) return NextResponse.json({ error: "Aucun IUF FFN relié à ce nageur" }, { status: 400 });

  let perfs;
  try {
    perfs = await fetchFfnPerformances(iuf);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Synchronisation FFN indisponible" }, { status: 502 });
  }

  // Ne remplace que les performances déjà enregistrées pour la saison en
  // cours : celles des saisons précédentes restent intactes, pour garder la
  // progression du nageur épreuve par épreuve d'une saison à l'autre.
  const saison = await getActiveSaison();
  const saisonLabel = saison?.label ?? "2026-2027";

  await prisma.$transaction([
    prisma.nageur.update({ where: { id }, data: { ffnIuf: iuf, ffnSyncedAt: new Date() } }),
    prisma.performance.deleteMany({ where: { nageurId: id, saison: saisonLabel } }),
    prisma.performance.createMany({
      data: perfs.map((p) => ({
        nageurId: id,
        epreuve: `${p.epreuve} (${p.bassin})`,
        temps: p.temps,
        points: p.points,
        niveau: p.niveau,
        // Le site FFN ne donne pas de delta saison-sur-saison ni de rang
        // national sur cette page (ça viendrait d'un outil de ranking
        // séparé, pas construit ici) — "—" plutôt qu'une valeur inventée.
        deltaSaison: "—",
        rangNat: "—",
        saison: saisonLabel,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true, count: perfs.length });
}
