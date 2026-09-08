import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeResetToken } from "@/lib/password-reset";
import { hashPassword } from "@/lib/auth";
import { rateLimited, clientIp } from "@/lib/rate-limit";

const bodySchema = z.object({ token: z.string().min(1), password: z.string().min(10) });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  // Le token (32 octets aléatoires) rend le brute-force infaisable en soi,
  // mais autant ne pas laisser un client marteler l'endpoint sans limite.
  if (rateLimited(`reset:ip:${clientIp(request)}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de tentatives, réessaie plus tard" }, { status: 429 });
  }

  const userId = await consumeResetToken(parsed.data.token);
  if (!userId) return NextResponse.json({ error: "Ce lien de réinitialisation est invalide ou a expiré" }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
