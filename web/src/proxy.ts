import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "coachnat_session";

const PUBLIC_PATHS = ["/login", "/mot-de-passe-oublie", "/reinitialiser-mot-de-passe"];

function secretKey() {
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/((?!api|_next/static|_next/image|assets|favicon.ico).*)"],
};
