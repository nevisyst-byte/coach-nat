import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { searchFfnIndividus } from "@/lib/ffn";

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
