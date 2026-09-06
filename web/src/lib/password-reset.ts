import "server-only";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

// Retourne le jeton en clair (à mettre dans le lien mailé) — seul son hash
// est persisté. Les jetons précédents non utilisés du même utilisateur sont
// invalidés pour qu'un seul lien à la fois reste valide.
export async function createResetToken(userId: string) {
  const rawToken = randomBytes(32).toString("hex");
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    }),
  ]);
  return rawToken;
}

// Consomme le jeton (marque usedAt) et renvoie l'utilisateur associé, ou
// null si le jeton est invalide, expiré ou déjà utilisé.
export async function consumeResetToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) return null;
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record.userId;
}
