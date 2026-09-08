import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword, revokeAllSessionsForUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "COACH"]),
  password: z.string().min(10).optional().or(z.literal("")),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  let session;
  try {
    session = await requireAdmin();
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

  // Un mot de passe changé par un admin (ex. compte compromis) coupe les
  // sessions déjà ouvertes sous l'ancien mot de passe.
  if (password) await revokeAllSessionsForUser(id);

  const changements = [current.role !== role ? `rôle ${current.role}→${role}` : null, password ? "mot de passe changé" : null].filter(Boolean).join(", ");
  await logAudit({
    userId: session.userId,
    userName: session.name,
    role: session.role,
    action: "COMPTE_MODIFIE",
    cible: `${current.name} <${email.toLowerCase()}>`,
    detail: changements || undefined,
    ip: clientIp(request),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteContext) {
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
  await logAudit({
    userId: session.userId,
    userName: session.name,
    role: session.role,
    action: "COMPTE_SUPPRIME",
    cible: `${target.name} <${target.email}> (${target.role})`,
    ip: clientIp(request),
  });
  return NextResponse.json({ ok: true });
}
