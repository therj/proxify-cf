import type { Context } from 'hono';
import { decodeProtectedHeader, importJWK, jwtVerify } from 'jose';
import type { Env } from '../env';
import { hasGrant } from '../repo/grants';
import { getKeyByKid, isIssuedTokenRevoked } from '../repo/keys';
import { findRouteForRequest, getRouteHeaders } from '../repo/routes';
import { buildOutboundHeaders, buildUpstreamRequestUrl } from './upstream';

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const proxyHandler = async (c: Context<{ Bindings: Env }>) => {
  const req = c.req.raw;
  const url = new URL(req.url);
  const hostHeader = req.headers.get('Host') ?? '';

  const route = await findRouteForRequest(c.env.DB, hostHeader, url.pathname);
  if (!route) {
    return jsonError(404, 'No route configured for this host and path');
  }

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return jsonError(401, 'Missing or invalid Authorization header (expected Bearer JWT)');
  }

  const token = auth.slice('Bearer '.length).trim();
  if (!token) {
    return jsonError(401, 'Empty Bearer token');
  }

  let kid: string;
  try {
    const header = decodeProtectedHeader(token);
    if (!header.kid || typeof header.kid !== 'string') {
      return jsonError(401, 'JWT missing kid in header');
    }
    kid = header.kid;
  } catch {
    return jsonError(401, 'Invalid JWT');
  }

  const keyRow = await getKeyByKid(c.env.DB, kid);
  if (!keyRow || keyRow.revoked_at != null) {
    return jsonError(401, 'Unknown or revoked signing key');
  }

  let payload: { client_id?: string; jti?: string };
  try {
    const publicKey = await importJWK(JSON.parse(keyRow.public_jwk), keyRow.alg);
    const verified = await jwtVerify(token, publicKey, { algorithms: [keyRow.alg] });
    payload = verified.payload as { client_id?: string; jti?: string };
  } catch {
    return jsonError(401, 'JWT verification failed');
  }

  const clientId = payload.client_id;
  if (!clientId || typeof clientId !== 'string') {
    return jsonError(403, 'JWT payload must include client_id');
  }

  if (payload.jti && typeof payload.jti === 'string') {
    const revoked = await isIssuedTokenRevoked(c.env.DB, payload.jti);
    if (revoked) {
      return jsonError(401, 'Issued token has been revoked');
    }
  }

  const allowed = await hasGrant(c.env.DB, clientId, route.id);
  if (!allowed) {
    return jsonError(403, 'Client is not granted access to this route');
  }

  const headersList = await getRouteHeaders(c.env.DB, route.id);
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
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort') || msg.includes('Abort') || msg.includes('timeout')) {
      return jsonError(504, 'Upstream request timed out');
    }
    return jsonError(502, `Upstream error: ${msg}`);
  }
};
