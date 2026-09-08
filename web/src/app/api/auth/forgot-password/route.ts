import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createResetToken } from "@/lib/password-reset";
import { sendEmail, mailShell, getAppUrl, escapeHtml } from "@/lib/mail";
import { rateLimited, clientIp } from "@/lib/rate-limit";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Adresse mail invalide" }, { status: 400 });

  // Anti-bombardement : limite par IP (large) et par adresse visée
  // (stricte) — sans le révéler, la réponse reste identique dans tous les
  // cas (voir plus bas).
  const ip = clientIp(request);
  const email = parsed.data.email.toLowerCase();
  if (rateLimited(`forgot:ip:${ip}`, 10, 60 * 60 * 1000) || rateLimited(`forgot:cible:${email}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Toujours la même réponse, que le compte existe ou non — on ne révèle
  // jamais si une adresse mail est enregistrée dans l'app.
  if (user) {
    const rawToken = await createResetToken(user.id);
    const link = `${getAppUrl()}/reinitialiser-mot-de-passe?token=${rawToken}`;
    if (!process.env.RESEND_API_KEY) console.log(`[mail] Lien de réinitialisation (dev) : ${link}`);
    await sendEmail({
      to: user.email,
      subject: "Réinitialise ton mot de passe COACH-NAT",
      html: mailShell(
        "Réinitialisation de mot de passe",
        `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#B8C4D9;">Bonjour ${escapeHtml(user.name)},<br/>Une demande de réinitialisation de mot de passe a été faite pour ce compte. Ce lien est valable 1 heure.</p>
         <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#1E7BFF,#0F5FD6);color:#fff;text-decoration:none;font-weight:bold;font-size:13px;padding:12px 22px;border-radius:10px;">Choisir un nouveau mot de passe</a>
         <p style="margin:20px 0 0;font-size:12px;color:#61789B;">Si tu n'es pas à l'origine de cette demande, ignore simplement ce mail.</p>`
      ),
    });
  }

  return NextResponse.json({ ok: true });
}
