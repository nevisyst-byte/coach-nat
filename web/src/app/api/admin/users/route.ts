import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(10),
  role: z.enum(["ADMIN", "COACH"]),
  initials: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { email, name, password, role, initials } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Cet email existe déjà" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash,
      role,
      coach: role === "COACH" ? { create: { initials: initials || name.slice(0, 2).toUpperCase() } } : undefined,
    },
  });

  return NextResponse.json({ ok: true, id: user.id });
}
