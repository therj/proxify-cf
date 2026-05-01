import * as K from './keys';
import { KV_CACHE_TTL_SEC } from './ttl';

/**
 * Cache JSON payloads for admin GET handlers (same cfg epoch as proxy metadata invalidation).
 */
export async function cachedAdminGetJson<T>(
  kv: KVNamespace,
  cfgEpoch: number,
  pathAndQuery: string,
  loader: () => Promise<T>
): Promise<T> {
  const cacheKey = K.adminGetKey(cfgEpoch, pathAndQuery);
  const hit = await kv.get(cacheKey, { type: 'text' });
  if (hit != null) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      /* fall through */
    }
  }
  const data = await loader();
  await kv.put(cacheKey, JSON.stringify(data), { expirationTtl: KV_CACHE_TTL_SEC });
  return data;
}

/** Stable cache key from request URL (pathname + sorted query). */
export function adminRequestCacheKey(c: { req: { url: string } }): string {
  const u = new URL(c.req.url);
  const entries = [...u.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const qs = new URLSearchParams(entries).toString();
  return `${u.pathname}${qs ? `?${qs}` : ''}`;
}
