// Rate limiting simple in-memory por IP. Sin dependencias externas.
//
// Limitaciones:
// - Memoria del proceso: en Vercel cada serverless instance tiene su propio
//   Map, así que el límite real es por instance. Para limits estrictos
//   habría que usar Redis/Upstash. Para nuestro uso casual alcanza.
// - El Map crece sin límite si no expiramos. Mitigamos limpiando entries
//   viejos cada vez que escribimos.
//
// Default: 30 requests por minuto por IP.

type WindowMs = number;

// timestamp en ms de cada request reciente, por key (típicamente IP).
const buckets = new Map<string, number[]>();

const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_MS = 60_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  options: { limit?: number; windowMs?: WindowMs } = {}
): RateLimitResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  const cutoff = now - windowMs;

  const existing = buckets.get(key) ?? [];
  // Quedarnos solo con los recientes dentro de la ventana
  const recent = existing.filter((t) => t > cutoff);

  if (recent.length >= limit) {
    // Calcular cuándo expira el más viejo de los recientes — eso es cuando
    // el user puede reintentar
    const oldest = recent[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    buckets.set(key, recent);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  recent.push(now);
  buckets.set(key, recent);

  // Cleanup ocasional: borrar entries que están enteramente fuera del window
  if (buckets.size > 500) {
    for (const [k, ts] of buckets) {
      if (ts.every((t) => t <= cutoff)) buckets.delete(k);
    }
  }

  return {
    ok: true,
    remaining: limit - recent.length,
    retryAfterSeconds: 0,
  };
}

// Helper para extraer la IP del request en Next.js / Vercel.
// Prioriza headers de proxy (x-forwarded-for, x-real-ip) que Vercel setea.
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    // Puede venir como "ip1, ip2, ip3" — tomamos la primera (el cliente real)
    return xff.split(",")[0].trim();
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
