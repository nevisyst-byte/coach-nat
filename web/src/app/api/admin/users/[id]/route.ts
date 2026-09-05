import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "COACH"]),
  password: z.string().min(6).optional().or(z.literal("")),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { email, name, role, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing && existing.id !== id) return NextResponse.json({ error: "Cet email existe déjà" }, { status: 409 });

  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  if (current.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return NextResponse.json({ error: "Impossible de retirer le dernier compte administrateur" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: {
      email: email.toLowerCase(),
      name,
      role,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });

  if (role === "COACH") {
    await prisma.coach.upsert({
      where: { userId: id },
      update: {},
      create: { userId: id, initials: name.slice(0, 2).toUpperCase() },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.userId) return NextResponse.json({ error: "Impossible de supprimer ton propre compte" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return NextResponse.json({ error: "Impossible de supprimer le dernier compte administrateur" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
