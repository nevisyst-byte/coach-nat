import "server-only";
import { prisma } from "./prisma";

// Écriture best-effort, à l'image de sendEmail() : tracer une action ne
// doit jamais faire échouer l'action elle-même si le journal n'a pas pu
// être écrit.
export async function logAudit(entry: {
  userId?: string | null;
  userName: string;
  role?: string | null;
  action: string;
  cible?: string;
  detail?: string;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        userName: entry.userName,
        role: entry.role ?? null,
        action: entry.action,
        cible: entry.cible,
        detail: entry.detail,
        ip: entry.ip,
      },
    });
  } catch (e) {
    console.error("[audit] échec d'écriture:", e);
  }
}
