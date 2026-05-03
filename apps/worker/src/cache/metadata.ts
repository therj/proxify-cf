import type { Key, Route } from '@proxify-cf/shared';
import { findRouteForRequest, getRouteHeaders, hostHasAnyEnabledRoute, normalizeIncomingHost } from '../repo/routes';
import { getKeyByKid, isIssuedTokenRevoked } from '../repo/keys';
import { hasGrant } from '../repo/grants';
import * as K from './keys';
import { KV_CACHE_TTL_SEC } from './ttl';

function pathForLookup(pathname: string): string {
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

export async function cachedFindRouteForRequest(
  kv: KVNamespace,
  db: D1Database,
  cfgEpoch: number,
  hostHeader: string,
  pathname: string
): Promise<Route | null> {
  const host = normalizeIncomingHost(hostHeader);
  const path = pathForLookup(pathname);
  const cacheKey = K.routeLookupKey(cfgEpoch, host, path);
  const hit = await kv.get(cacheKey, { type: 'text' });
  if (hit != null) {
    try {
      const parsed = JSON.parse(hit) as Route | null;
      return parsed;
    } catch {
      /* fall through */
    }
  }
  const route = await findRouteForRequest(db, hostHeader, pathname);
  await kv.put(cacheKey, JSON.stringify(route), { expirationTtl: KV_CACHE_TTL_SEC });
  return route;
}

export async function cachedHostHasAnyEnabledRoute(
  kv: KVNamespace,
  db: D1Database,
  cfgEpoch: number,
  hostHeader: string
): Promise<boolean> {
  const host = normalizeIncomingHost(hostHeader);
  const cacheKey = K.hostHasRoutesKey(cfgEpoch, host);
  const hit = await kv.get(cacheKey, { type: 'text' });
  if (hit === '1') return true;
  if (hit === '0') return false;
  const has = await hostHasAnyEnabledRoute(db, hostHeader);
  await kv.put(cacheKey, has ? '1' : '0', { expirationTtl: KV_CACHE_TTL_SEC });
  return has;
}

/** When false, skip access_log for no_route (SPA-only or explicitly omitted host). */
export async function shouldLogNoRouteAccess(
  kv: KVNamespace,
  db: D1Database,
  cfgEpoch: number,
  hostHeader: string,
  omitHostsCsv: string | undefined
): Promise<boolean> {
  const host = normalizeIncomingHost(hostHeader);
  if (omitHostsCsv?.trim()) {
    for (const part of omitHostsCsv.split(',')) {
      const p = normalizeIncomingHost(part.trim());
      if (p && p === host) return false;
    }
  }
  return cachedHostHasAnyEnabledRoute(kv, db, cfgEpoch, hostHeader);
}

export async function cachedGetRouteHeaders(
  kv: KVNamespace,
  db: D1Database,
  cfgEpoch: number,
  routeId: string
): Promise<{ header_name: string; header_value: string }[]> {
  const cacheKey = K.routeHeadersKey(cfgEpoch, routeId);
  const hit = await kv.get(cacheKey, { type: 'text' });
  if (hit != null) {
    try {
      const parsed = JSON.parse(hit) as { header_name: string; header_value: string }[];
      return parsed;
    } catch {
      /* fall through */
    }
  }
  const rows = await getRouteHeaders(db, routeId);
  const slim = rows.map((r: { header_name: string; header_value: string }) => ({
    header_name: r.header_name,
    header_value: r.header_value,
  }));
  await kv.put(cacheKey, JSON.stringify(slim), { expirationTtl: KV_CACHE_TTL_SEC });
  return slim;
}

/** Proxy verification uses public material only; never persist encrypted private JWK. */
function keyForCache(row: Key): Key {
  return { ...row, private_jwk_encrypted: null };
}

export async function cachedGetKeyByKid(
  kv: KVNamespace,
  db: D1Database,
  cfgEpoch: number,
  kid: string
): Promise<Key | null> {
  const cacheKey = K.signingKeyKey(cfgEpoch, kid);
  const hit = await kv.get(cacheKey, { type: 'text' });
  if (hit != null) {
    try {
      return JSON.parse(hit) as Key;
    } catch {
      /* fall through */
    }
  }
  const row = await getKeyByKid(db, kid);
  if (!row) {
    await kv.put(cacheKey, JSON.stringify(null), { expirationTtl: KV_CACHE_TTL_SEC });
    return null;
  }
  const safe = keyForCache(row);
  await kv.put(cacheKey, JSON.stringify(safe), { expirationTtl: KV_CACHE_TTL_SEC });
  return safe;
}

export async function cachedHasGrant(
  kv: KVNamespace,
  db: D1Database,
  cfgEpoch: number,
  clientId: string,
  routeId: string
): Promise<boolean> {
  const cacheKey = K.grantKey(cfgEpoch, clientId, routeId);
  const hit = await kv.get(cacheKey, { type: 'text' });
  if (hit != null) {
    if (hit === '1') return true;
    if (hit === '0') return false;
  }
  const ok = await hasGrant(db, clientId, routeId);
  await kv.put(cacheKey, ok ? '1' : '0', { expirationTtl: KV_CACHE_TTL_SEC });
  return ok;
}

export async function cachedIsIssuedTokenRevoked(
  kv: KVNamespace,
  db: D1Database,
  cfgEpoch: number,
  jti: string
): Promise<boolean> {
  const cacheKey = K.jtiRevocationKey(cfgEpoch, jti);
  const hit = await kv.get(cacheKey, { type: 'text' });
  if (hit != null) {
    if (hit === '1') return true;
    if (hit === '0') return false;
  }
  const revoked = await isIssuedTokenRevoked(db, jti);
  await kv.put(cacheKey, revoked ? '1' : '0', { expirationTtl: KV_CACHE_TTL_SEC });
  return revoked;
}
