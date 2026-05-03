import type { Context } from 'hono';
import type { AccessOutcome, Route } from '@proxify-cf/shared';
import { decodeProtectedHeader, importJWK, jwtVerify } from 'jose';
import type { Env } from '../env';
import { getCfgEpoch } from '../cache/epoch';
import {
  cachedFindRouteForRequest,
  cachedGetKeyByKid,
  cachedHasGrant,
  cachedGetRouteHeaders,
  cachedIsIssuedTokenRevoked,
} from '../cache/metadata';
import { normalizeIncomingHost } from '../repo/routes';
import { appendAccessLog, type NewAccessLog } from '../repo/accessLog';
import { buildOutboundHeaders, buildUpstreamRequestUrl } from './upstream';

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function pathNorm(pathname: string): string {
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function clientIpFromRequest(req: Request): string | null {
  return (
    req.headers.get('CF-Connecting-IP') ??
    req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    null
  );
}

/** Non-blocking D1 append; uses Workers `waitUntil` when ExecutionContext is present. */
function scheduleAppendAccessLog(c: Context<{ Bindings: Env }>, row: NewAccessLog): void {
  const p = appendAccessLog(c.env.DB, row).catch((err) => {
    console.error('[access_log]', err);
  });
  try {
    c.executionCtx.waitUntil(p);
  } catch {
    void p;
  }
}

export type ProxyHandlerOptions = {
  /** When set, skips KV/D1 route lookup (caller already resolved the route). */
  route?: Route | null;
};

export const proxyHandler = async (c: Context<{ Bindings: Env }>, opts?: ProxyHandlerOptions) => {
  const t0 = performance.now();
  const req = c.req.raw;
  const url = new URL(req.url);
  const hostHeader = req.headers.get('Host') ?? '';
  const path = pathNorm(url.pathname);
  const hostLog = normalizeIncomingHost(hostHeader);
  const clientIp = clientIpFromRequest(req);
  const incomingMethod = req.method;
  const kv = c.env.KV_BINDING;

  const base = (): Pick<NewAccessLog, 'host' | 'path' | 'client_ip'> => ({
    host: hostLog,
    path,
    client_ip: clientIp,
  });

  const recordDenied = (row: Omit<NewAccessLog, 'host' | 'path' | 'client_ip'>) => {
    const latency_ms = Math.round(performance.now() - t0);
    scheduleAppendAccessLog(c, { ...base(), ...row, latency_ms });
  };

  const cfgEpoch = await getCfgEpoch(kv);

  let route: Route | null;
  if (opts?.route !== undefined) {
    route = opts.route;
  } else {
    route = await cachedFindRouteForRequest(kv, c.env.DB, cfgEpoch, hostHeader, url.pathname);
  }

  if (!route) {
    recordDenied({ method: incomingMethod, outcome: 'no_route', detail: { reason: 'no matching route' } });
    return jsonError(404, 'No route configured for this host and path');
  }

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    recordDenied({
      method: incomingMethod,
      route_id: route.id,
      outcome: 'no_auth',
      detail: { reason: 'missing_bearer' },
    });
    return jsonError(401, 'Missing or invalid Authorization header (expected Bearer JWT)');
  }

  const token = auth.slice('Bearer '.length).trim();
  if (!token) {
    recordDenied({
      method: incomingMethod,
      route_id: route.id,
      outcome: 'empty_token',
    });
    return jsonError(401, 'Empty Bearer token');
  }

  let kid: string;
  try {
    const header = decodeProtectedHeader(token);
    if (!header.kid || typeof header.kid !== 'string') {
      recordDenied({
        method: incomingMethod,
        route_id: route.id,
        outcome: 'jwt_missing_kid',
      });
      return jsonError(401, 'JWT missing kid in header');
    }
    kid = header.kid;
  } catch {
    recordDenied({
      method: incomingMethod,
      route_id: route.id,
      outcome: 'jwt_invalid_header',
    });
    return jsonError(401, 'Invalid JWT');
  }

  const keyRow = await cachedGetKeyByKid(kv, c.env.DB, cfgEpoch, kid);
  if (!keyRow || keyRow.revoked_at != null) {
    recordDenied({
      method: incomingMethod,
      route_id: route.id,
      kid,
      outcome: 'key_revoked_or_unknown',
    });
    return jsonError(401, 'Unknown or revoked signing key');
  }

  let payload: { client_id?: string; jti?: string };
  try {
    const publicKey = await importJWK(JSON.parse(keyRow.public_jwk), keyRow.alg);
    const verified = await jwtVerify(token, publicKey, { algorithms: [keyRow.alg] });
    payload = verified.payload as { client_id?: string; jti?: string };
  } catch {
    recordDenied({
      method: incomingMethod,
      route_id: route.id,
      kid,
      outcome: 'jwt_verify_failed',
    });
    return jsonError(401, 'JWT verification failed');
  }

  const clientId = payload.client_id;
  if (!clientId || typeof clientId !== 'string') {
    recordDenied({
      method: incomingMethod,
      route_id: route.id,
      kid,
      outcome: 'missing_client_id',
    });
    return jsonError(403, 'JWT payload must include client_id');
  }

  const jti = payload.jti && typeof payload.jti === 'string' ? payload.jti : null;

  if (payload.jti && typeof payload.jti === 'string') {
    const revoked = await cachedIsIssuedTokenRevoked(kv, c.env.DB, cfgEpoch, payload.jti);
    if (revoked) {
      recordDenied({
        method: incomingMethod,
        route_id: route.id,
        client_id: clientId,
        kid,
        jti,
        outcome: 'token_revoked',
      });
      return jsonError(401, 'Issued token has been revoked');
    }
  }

  const allowed = await cachedHasGrant(kv, c.env.DB, cfgEpoch, clientId, route.id);
  if (!allowed) {
    recordDenied({
      method: incomingMethod,
      route_id: route.id,
      client_id: clientId,
      kid,
      jti,
      outcome: 'no_grant',
    });
    return jsonError(403, 'Client is not granted access to this route');
  }

  const headersList = await cachedGetRouteHeaders(kv, c.env.DB, cfgEpoch, route.id);
  const upstreamUrl = buildUpstreamRequestUrl(route, url);
  const upstreamOrigin = new URL(route.upstream_url);

  const outboundHeaders = buildOutboundHeaders(req.headers, upstreamOrigin.host, headersList);

  let method = req.method;
  if (route.preserve_method !== 1) {
    method = 'GET';
  }

  let body: BodyInit | undefined | null = req.body;
  if (route.forward_body !== 1 || method === 'GET' || method === 'HEAD') {
    body = undefined;
  }

  const timeoutMs = route.timeout_ms ?? 10000;

  try {
    const upstreamReq = new Request(upstreamUrl.toString(), {
      method,
      headers: outboundHeaders,
      body: body ?? undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    const res = await fetch(upstreamReq);
    const latency_ms = Math.round(performance.now() - t0);
    const outcome: AccessOutcome =
      res.status >= 400 ? 'upstream_error' : 'upstream_ok';
    scheduleAppendAccessLog(c, {
      ...base(),
      method,
      route_id: route.id,
      client_id: clientId,
      kid,
      jti,
      outcome,
      upstream_status: res.status,
      latency_ms,
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const latency_ms = Math.round(performance.now() - t0);
    if (msg.includes('abort') || msg.includes('Abort') || msg.includes('timeout')) {
      scheduleAppendAccessLog(c, {
        ...base(),
        method,
        route_id: route.id,
        client_id: clientId,
        kid,
        jti,
        outcome: 'timeout',
        latency_ms,
        detail: { message: msg.slice(0, 200) },
      });
      return jsonError(504, 'Upstream request timed out');
    }
    scheduleAppendAccessLog(c, {
      ...base(),
      method,
      route_id: route.id,
      client_id: clientId,
      kid,
      jti,
      outcome: 'upstream_error',
      latency_ms,
      detail: { message: msg.slice(0, 200) },
    });
    return jsonError(502, `Upstream error: ${msg}`);
  }
};
