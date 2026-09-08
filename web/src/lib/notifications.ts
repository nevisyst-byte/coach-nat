import "server-only";
import { prisma } from "@/lib/prisma";
import { sendEmail, mailShell, getAppUrl, escapeHtml } from "@/lib/mail";
import { JOURS } from "@/lib/format";

async function emailsCoachsEtAdmins() {
  const users = await prisma.user.findMany({ where: { role: { in: ["COACH", "ADMIN"] } }, select: { email: true } });
  return users.map((u) => u.email);
}

async function emailsAdmins() {
  const users = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  return users.map((u) => u.email);
}

const paragraph = "margin:0 0 16px;font-size:14px;line-height:1.5;color:#B8C4D9;";
const linkButton =
  "display:inline-block;background:linear-gradient(135deg,#1E7BFF,#0F5FD6);color:#fff;text-decoration:none;font-weight:bold;font-size:13px;padding:12px 22px;border-radius:10px;";

// Un créneau vient de passer (ou d'être créé) à l'état « à couvrir » :
// personne n'est en mesure de l'encadrer. On prévient tous les coachs et
// l'administration, pour qu'un coach puisse se proposer.
export async function notifierCreneauACouvrir(creneau: { jour: number; debut: string; fin: string; bassin: string; groupeNom: string }) {
  const to = await emailsCoachsEtAdmins();
  if (to.length === 0) return;
  await sendEmail({
    to,
    subject: `⚠ Créneau à couvrir — ${JOURS[creneau.jour]} ${creneau.debut}`,
    html: mailShell(
      "Créneau à couvrir",
      `<p style="${paragraph}">Le créneau <strong style="color:#fff;">${escapeHtml(creneau.groupeNom)}</strong> du <strong style="color:#fff;">${JOURS[creneau.jour]} ${creneau.debut}–${creneau.fin}</strong> (${escapeHtml(creneau.bassin)}) n'a plus personne pour l'encadrer.</p>
       <p style="${paragraph}margin-bottom:20px;">Si tu peux le prendre, préviens l'administration ou réassigne-toi directement depuis le planning.</p>
       <a href="${getAppUrl()}/planning" style="${linkButton}">Voir le planning</a>`
    ),
  });
}

// Un coach ou un nageur vient de déclarer une absence — l'administration
// est prévenue pour évaluer l'impact (créneaux à couvrir, remplacement...).
export async function notifierAbsenceDeclaree(info: { qui: "nageur" | "coach"; nom: string; periode: string; motif: string }) {
  const to = await emailsAdmins();
  if (to.length === 0) return;
  const label = info.qui === "nageur" ? "Absence nageur déclarée" : "Absence coach déclarée";
  await sendEmail({
    to,
    subject: `${label} — ${info.nom}`,
    html: mailShell(
      label,
      `<p style="${paragraph}"><strong style="color:#fff;">${escapeHtml(info.nom)}</strong> — ${escapeHtml(info.periode)}</p>
       <p style="${paragraph}margin-bottom:20px;">Motif : ${info.motif ? escapeHtml(info.motif) : "non précisé"}</p>
       <a href="${getAppUrl()}/absences" style="${linkButton}">Voir les absences</a>`
    ),
  });
}

// Rappel avant une échéance de saison (compétition, réunion, forum...).
export async function notifierEcheanceAVenir(echeance: { titre: string; detail: string; date: Date }) {
  const to = await emailsCoachsEtAdmins();
  if (to.length === 0) return;
  const dateLabel = echeance.date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
  await sendEmail({
    to,
    subject: `Rappel — ${echeance.titre} (${dateLabel})`,
    html: mailShell(
      "Échéance à venir",
      `<p style="${paragraph}"><strong style="color:#fff;">${escapeHtml(echeance.titre)}</strong><br/>${dateLabel}</p>
       <p style="${paragraph}margin-bottom:20px;">${escapeHtml(echeance.detail)}</p>
       <a href="${getAppUrl()}/calendrier" style="${linkButton}">Voir le calendrier</a>`
    ),
  });
}
