import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const SCREENS = [
  { label: "Tableau de bord général", href: "/general" },
  { label: "Tableau de bord coach", href: "/coach" },
  { label: "Planning global", href: "/planning" },
  { label: "Mon planning", href: "/mon-planning" },
  { label: "Stages", href: "/stages" },
  { label: "Présences", href: "/presences" },
  { label: "Calendrier", href: "/calendrier" },
  { label: "Absences & congés", href: "/absences" },
  { label: "Créateur de séance", href: "/seance" },
  { label: "Thématiques d'entraînement", href: "/thematiques" },
];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ results: [] }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  const screenResults = SCREENS.filter((s) => s.label.toLowerCase().includes(q)).map((s) => ({
    kind: "Écran",
    label: s.label,
    href: s.href,
    meta: "",
  }));

  const swimmers = await prisma.nageur.findMany({
    where: { nom: { contains: q, mode: "insensitive" } },
    take: 6,
  });
  const swimmerResults = swimmers.map((n) => ({
    kind: "Nageur",
    label: n.nom,
    href: `/nageurs/${n.id}`,
    meta: `${n.categorie} · ${n.pointsFFN} pts`,
  }));

  return NextResponse.json({ results: [...screenResults, ...swimmerResults].slice(0, 7) });
}
