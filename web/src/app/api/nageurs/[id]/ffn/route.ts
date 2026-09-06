import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { searchFfnIndividus } from "@/lib/ffn";
import { syncNageurFfn } from "@/lib/ffn-sync";

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

  try {
    const result = await syncNageurFfn(id, iuf);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Synchronisation FFN indisponible" }, { status: 502 });
  }
}
