import { Hono, type Context } from 'hono';
import { adminRoutes } from './admin/routes';
import { proxyHandler } from './proxy/handler';
import { Env } from './env';
import { getCfgEpoch } from './cache/epoch';
import { cachedFindRouteForRequest } from './cache/metadata';
import { publicApiRoutes } from './api/routes';

const app = new Hono<{ Bindings: Env }>();

/** Single Vite SPA shell served at `/` and as fallback for `/admin/*` deep links. */
const SPA_INDEX = '/index.html';

const fetchSpaShell = (c: Context<{ Bindings: Env }>) => {
  const url = new URL(c.req.url);
  url.pathname = SPA_INDEX;
  return c.env.ASSETS.fetch(new Request(url, c.req));
};

const serveAssetsPassThrough = (c: Context<{ Bindings: Env }>) => c.env.ASSETS.fetch(c.req.raw);

const faviconIcoRedirect = (c: Context<{ Bindings: Env }>) => {
  const u = new URL(c.req.url);
  u.pathname = '/favicon.svg';
  return c.redirect(u.toString(), 302);
};

// Home + admin UI (same React build), OR reverse-proxy when Host/path matches a configured route
const handleRoot = async (c: Context<{ Bindings: Env }>) => {
  const host = c.req.header('Host') ?? '';
  const url = new URL(c.req.url);
  try {
    const cfgEpoch = await getCfgEpoch(c.env.KV_BINDING);
    const proxyRoute = await cachedFindRouteForRequest(
      c.env.KV_BINDING,
      c.env.DB,
      cfgEpoch,
      host,
      url.pathname
    );
    if (proxyRoute) {
      return proxyHandler(c, { route: proxyRoute });
    }
  } catch (e) {
    console.error('[/] proxy route resolution failed; serving SPA shell', e);
  }
  if (c.req.method === 'HEAD') {
    const spaUrl = new URL(c.req.url);
    spaUrl.pathname = SPA_INDEX;
    return c.env.ASSETS.fetch(new Request(spaUrl, { method: 'HEAD', headers: c.req.raw.headers }));
  }
  return fetchSpaShell(c);
};

app.on(['GET', 'HEAD'], '/', handleRoot);

app.route('/admin/api/v1', adminRoutes);
app.route('/api', publicApiRoutes);

app.on(['GET', 'HEAD'], '/assets/*', serveAssetsPassThrough);

/** Vite `public/` copies (stable URLs for crawlers and default `favicon.ico` lookups). */
app.on(['GET', 'HEAD'], '/favicon.svg', serveAssetsPassThrough);
app.on(['GET', 'HEAD'], '/favicon.ico', faviconIcoRedirect);
app.on(['GET', 'HEAD'], '/og-image.svg', serveAssetsPassThrough);

app.on(['GET', 'HEAD'], '/index.html', serveAssetsPassThrough);

/**
 * SPA routes (`/admin/*`, `/docs/*`); bundles under `/assets/*`; unknown paths fall back to `index.html`.
 */
const serveSpaFallback = async (c: Context<{ Bindings: Env }>) => {
  const url = new URL(c.req.url);
  const path = url.pathname;

  if (path.startsWith('/admin/api') || path === '/api' || path.startsWith('/api/')) {
    return c.notFound();
  }

  const direct = await c.env.ASSETS.fetch(c.req.raw);
  if (direct.status !== 404) {
    return direct;
  }

  url.pathname = SPA_INDEX;
  return c.env.ASSETS.fetch(new Request(url, c.req));
};

app.on(['GET', 'HEAD'], '/admin', serveSpaFallback);
app.on(['GET', 'HEAD'], '/admin/*', serveSpaFallback);
app.on(['GET', 'HEAD'], '/docs', serveSpaFallback);
app.on(['GET', 'HEAD'], '/docs/*', serveSpaFallback);
app.on(['GET', 'HEAD'], '/health', serveSpaFallback);
app.on(['GET', 'HEAD'], '/health/*', serveSpaFallback);

app.all('*', (c) => proxyHandler(c));

export default app;
