import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, createSessionCookie } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 400 });
  }

  const session = await authenticate(parsed.data.email, parsed.data.password);
  if (!session) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
  }

  await createSessionCookie(session);
  return NextResponse.json({ ok: true, role: session.role });
}
