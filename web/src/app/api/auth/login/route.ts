import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, createSessionCookie } from "@/lib/auth";
import { rateLimited, clientIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function tropDeTentatives() {
  return NextResponse.json({ error: "Trop de tentatives, réessaie dans quelques minutes" }, { status: 429 });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 400 });
  }

  // Deux limites : une large par IP (anti credential-stuffing sur tous les
  // comptes), une plus stricte par IP+compte visé (anti brute-force ciblé)
  // — sans jamais révéler laquelle est atteinte.
  const ip = clientIp(request);
  if (rateLimited(`login:ip:${ip}`, 30, 15 * 60 * 1000) || rateLimited(`login:cible:${ip}:${parsed.data.email.toLowerCase()}`, 10, 15 * 60 * 1000)) {
    return tropDeTentatives();
  }

  const auth = await authenticate(parsed.data.email, parsed.data.password);
  if (!auth) {
    await logAudit({ userName: parsed.data.email.toLowerCase(), action: "LOGIN_ECHEC", ip });
    return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
  }

  await createSessionCookie(auth, { ip, userAgent: request.headers.get("user-agent") ?? undefined });
  await logAudit({ userId: auth.userId, userName: auth.name, role: auth.role, action: "LOGIN", ip });
  return NextResponse.json({ ok: true, role: auth.role });
}
