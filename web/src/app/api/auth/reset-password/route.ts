import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeResetToken } from "@/lib/password-reset";
import { hashPassword } from "@/lib/auth";

const bodySchema = z.object({ token: z.string().min(1), password: z.string().min(6) });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const userId = await consumeResetToken(parsed.data.token);
  if (!userId) return NextResponse.json({ error: "Ce lien de réinitialisation est invalide ou a expiré" }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
