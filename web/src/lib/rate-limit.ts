import "server-only";

// Limiteur de débit en mémoire — suffisant ici : un seul conteneur app (pas
// de réplicas), donc pas besoin d'un store partagé (Redis...) pour que les
// compteurs soient cohérents entre requêtes.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Purge périodique pour ne pas laisser grossir la Map indéfiniment sur un
// process long-lived. unref() : ce timer ne doit pas empêcher le process de
// s'arrêter proprement (ex. lors d'un redémarrage de conteneur).
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt < now) buckets.delete(key);
}, 5 * 60 * 1000);
cleanup.unref?.();

// true si la limite est déjà atteinte pour cette clé (n'incrémente pas dans
// ce cas — sinon un client bloqué qui continue de réessayer repousserait
// indéfiniment sa propre fenêtre de blocage).
export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (bucket.count >= limit) return true;
  bucket.count++;
  return false;
}

// Derrière le tunnel Cloudflare, l'IP réelle du client arrive via l'en-tête
// CF-Connecting-IP (posé par Cloudflare) ou, à défaut, le premier maillon de
// X-Forwarded-For.
export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
