import type { NextConfig } from "next";

// CSP volontairement sans nonce (donc avec 'unsafe-inline' pour les scripts
// et styles) : Next.js/React hydratent via des données injectées en inline,
// mettre en place une CSP stricte à base de nonce demanderait de générer un
// nonce par requête dans proxy.ts et de le propager à chaque page — pas fait
// ici. Ce qui compte le plus reste couvert : aucun script/style/frame/appel
// depuis une origine externe non listée.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
