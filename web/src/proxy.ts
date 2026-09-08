import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "coachnat_session";

const PUBLIC_PATHS = ["/login", "/mot-de-passe-oublie", "/reinitialiser-mot-de-passe"];

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant");
  return new TextEncoder().encode(secret);
}

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Les routes API gèrent elles-mêmes leur authentification (requireSession
  // etc.) et répondent en JSON — pas de redirection de page ici. Seule
  // protection ajoutée : sur une mutation, l'en-tête Origin (envoyé par les
  // navigateurs sur fetch/XHR) doit correspondre à ce site, en défense
  // supplémentaire par rapport au cookie SameSite=lax contre le CSRF.
  if (pathname.startsWith("/api")) {
    if (MUTATING_METHODS.includes(request.method)) {
      const origin = request.headers.get("origin");
      if (origin && origin !== request.nextUrl.origin) {
        return NextResponse.json({ error: "Origine invalide" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let payload: { role?: string } | null = null;
  if (token) {
    try {
      const verified = await jwtVerify(token, secretKey());
      payload = verified.payload as { role?: string };
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/general", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|assets|favicon.ico).*)"],
};
