/**
 * Reads a JSON object body. Returns null for malformed JSON or a non-object
 * body (array, string, number), so routes can answer 400 instead of throwing
 * a 500 out of `request.json()` or a later property access.
 */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as T;
  } catch {
    return null;
  }
}

// ponytail: in-memory counters, so the limit is per server instance and resets
// on cold start. Enough to stop one user looping the paid LLM routes; move to a
// shared store (Upstash/Postgres) if this ever runs on more than one instance.
const hits = new Map<string, number[]>();

/**
 * Sliding-window rate limit. Returns true when the call is allowed.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  // Drop keys that have gone quiet so the map cannot grow without bound.
  if (hits.size > 10_000) {
    hits.forEach((times, k) => {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    });
  }

  return true;
}

/** LLM routes: expensive per call, so a low per-user ceiling. */
export const AI_RATE_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 } as const;

/**
 * A storage key is only acceptable as "<user id>/<filename>" — exactly two
 * non-empty segments, the first being the caller's id. A prefix check is not
 * enough: "<own id>/../<victim id>/file.pdf" starts with the caller's id, and
 * the dot segment is collapsed by the URL parser before it reaches storage,
 * so a service-role client would happily read another user's file.
 */
export function isOwnedStoragePath(filePath: unknown, userId: string): filePath is string {
  if (typeof filePath !== 'string' || !userId) return false;
  const segments = filePath.split('/');
  return segments.length === 2 && segments[0] === userId && segments[1].length > 0;
}

/**
 * Constrains a redirect target to a same-origin path. `${origin}${next}` looks
 * safe, but next="@evil.com" resolves to the host evil.com and next="//evil.com"
 * is a protocol-relative URL — both send a freshly minted session off-site.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
