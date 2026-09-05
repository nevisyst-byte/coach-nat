import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; creneauId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { creneauId } = await params;
  await prisma.creneauStage.delete({ where: { id: creneauId } });
  return NextResponse.json({ ok: true });
}
