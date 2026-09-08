import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

const COOKIE_NAME = "coachnat_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant");
  return new TextEncoder().encode(secret);
}

export type AuthResult = {
  userId: string;
  role: Role;
  name: string;
  coachId: string | null;
};

export type SessionPayload = AuthResult & { sessionId: string };

const BCRYPT_COST = 12;
// Hash factice (coût identique) utilisé pour comparer un temps constant
// quand l'e-mail n'existe pas — sinon authenticate() répond plus vite pour
// un compte inexistant que pour un mauvais mot de passe, ce qui permet de
// deviner les e-mails inscrits par mesure du temps de réponse.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-pour-temps-constant", BCRYPT_COST);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Crée une ligne Session (voir schema.prisma) en plus du cookie : c'est elle
// qui permet de révoquer un jeton précis (déconnexion, changement de mot de
// passe) sans attendre son expiration naturelle (7 jours). Retourne l'id de
// session, utile pour le journal d'audit de l'appelant.
export async function createSessionCookie(payload: AuthResult, meta?: { ip?: string; userAgent?: string }) {
  const session = await prisma.session.create({ data: { userId: payload.userId, ip: meta?.ip, userAgent: meta?.userAgent } });

  const token = await new SignJWT({ ...payload, sessionId: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return session.id;
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function revokeSession(sessionId: string) {
  await prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

// Utilisé après un changement de mot de passe (reset ou admin) : coupe les
// autres sessions déjà ouvertes, au cas où le compte était compromis.
export async function revokeAllSessionsForUser(userId: string, exceptSessionId?: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}

export async function readSessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Le rôle (et l'existence même du compte) sont revérifiés en base à chaque
// appel plutôt que de faire confiance au JWT : sinon un admin rétrogradé en
// coach, ou un compte supprimé, garde ses droits jusqu'à l'expiration du
// cookie (7 jours) — c'était le cas avant ce correctif. cache() dédoublonne
// les appels au sein d'une même requête (layout + page + route appellent
// tous getSession()) pour ne pas multiplier les requêtes SQL.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const payload = await readSessionToken(token);
  if (!payload?.sessionId) return null;

  const [user, session] = await Promise.all([
    prisma.user.findUnique({ where: { id: payload.userId }, include: { coach: true } }),
    prisma.session.findUnique({ where: { id: payload.sessionId } }),
  ]);
  if (!user || !session || session.revokedAt) return null;
  return { userId: user.id, sessionId: session.id, role: user.role, name: user.name, coachId: user.coach?.id ?? null };
});

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "ADMIN") throw new Error("FORBIDDEN");
  return session;
}

// Groupes, nageurs, planning et plans d'entraînement sont délégués aux
// coachs — seule la gestion des comptes membres reste réservée à l'admin
// (voir requireAdmin, utilisé uniquement par /api/admin/users).
export async function requireCoachOrAdmin() {
  const session = await requireSession();
  if (session.role !== "ADMIN" && session.role !== "COACH") throw new Error("FORBIDDEN");
  return session;
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { coach: true },
  });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return null;
  return {
    userId: user.id,
    role: user.role,
    name: user.name,
    coachId: user.coach?.id ?? null,
  } satisfies AuthResult;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
