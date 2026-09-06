import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchFfnPerformances } from "@/lib/ffn";

// Aperçu en lecture seule des performances FFN d'un IUF, sans toucher à la
// base — utilisé avant la création d'un nageur pour pré-remplir son année de
// naissance estimée à partir de ses performances, sans avoir à le créer
// d'abord juste pour pouvoir faire la recherche.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const iuf = new URL(request.url).searchParams.get("iuf") ?? "";
  if (!iuf) return NextResponse.json({ error: "IUF manquant" }, { status: 400 });

  try {
    const { performances, anneeNaissanceEstimee } = await fetchFfnPerformances(iuf);
    return NextResponse.json({ count: performances.length, anneeNaissanceEstimee });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fiche FFN indisponible" }, { status: 502 });
  }
}
