import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeResetToken } from "@/lib/password-reset";
import { hashPassword, revokeAllSessionsForUser } from "@/lib/auth";
import { rateLimited, clientIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

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
  const user = await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Un compte dont le mot de passe vient d'être changé (potentiellement
  // parce qu'il était compromis) ne doit pas garder de sessions ouvertes
  // ailleurs sous l'ancien mot de passe.
  await revokeAllSessionsForUser(userId);
  await logAudit({ userId, userName: user.name, role: user.role, action: "MOT_DE_PASSE_REINITIALISE", ip: clientIp(request) });

  return NextResponse.json({ ok: true });
}
