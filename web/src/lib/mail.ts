import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

// Enveloppe HTML commune, sobre, cohérente avec l'identité de l'app.
export function mailShell(title: string, bodyHtml: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#050A14;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050A14;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#101A2B;border-radius:16px;overflow:hidden;border:1px solid #1E2C42;">
            <tr>
              <td style="background:linear-gradient(135deg,#1E7BFF,#0F5FD6);padding:20px 28px;">
                <span style="color:#fff;font-size:13px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">COACH-NAT</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#E7EDF7;">
                <h1 style="margin:0 0 16px;font-size:19px;color:#fff;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// N'échoue jamais bruyamment : un envoi de mail raté ne doit pas casser
// l'action métier qui le déclenche (création de créneau, déclaration
// d'absence...). Sans RESEND_API_KEY (dev local), l'envoi est simplement
// journalisé et ignoré.
export async function sendEmail({ to, subject, html }: { to: string | string[]; html: string; subject: string }) {
  const resend = getClient();
  const from = process.env.MAIL_FROM ?? "COACH-NAT <onboarding@resend.dev>";
  if (!resend) {
    console.warn(`[mail] RESEND_API_KEY absent — mail non envoyé (sujet: "${subject}", à: ${Array.isArray(to) ? to.join(", ") : to})`);
    return { ok: false as const, skipped: true as const };
  }
  try {
    await resend.emails.send({ from, to, subject, html });
    return { ok: true as const };
  } catch (e) {
    console.error("[mail] Échec d'envoi:", e);
    return { ok: false as const, error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
