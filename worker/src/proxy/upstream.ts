import type { Route } from '@proxify-cf/shared';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export function buildUpstreamRequestUrl(route: Route, reqUrl: URL): URL {
  const upstream = new URL(route.upstream_url);
  const prefix = route.path_prefix || '/';
  let tail = reqUrl.pathname;
  if (prefix !== '/') {
    tail = reqUrl.pathname.startsWith(prefix)
      ? reqUrl.pathname.slice(prefix.length) || '/'
      : '/';
  }
  const basePath = upstream.pathname.replace(/\/$/, '');
  const tailNorm = tail.startsWith('/') ? tail : `/${tail}`;
  let pathname = `${basePath}${tailNorm}`.replace(/\/+/g, '/');
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  const out = new URL(pathname, upstream.origin);
  if (route.preserve_query === 1) {
    out.search = reqUrl.search;
  }
  return out;
}

/** Strip hop-by-hop and caller Authorization; route headers applied after. */
export function buildOutboundHeaders(
  incoming: Headers,
  upstreamHost: string,
  routeHeaders: { header_name: string; header_value: string }[]
): Headers {
  const out = new Headers();
  for (const [key, value] of incoming.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) continue;
    if (lower === 'host') continue;
    if (lower === 'authorization') continue;
    if (lower === 'cf-connecting-ip') continue;
    out.append(key, value);
  }
  out.set('Host', upstreamHost);
  for (const row of routeHeaders) {
    out.set(row.header_name, row.header_value);
  }
  return out;
}
