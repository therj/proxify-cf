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

// Home + admin UI (same React build), OR reverse-proxy when Host/path matches a configured route
app.get('/', async (c) => {
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
    console.error('[GET /] proxy route resolution failed; serving SPA shell', e);
  }
  return fetchSpaShell(c);
});

app.route('/admin/api/v1', adminRoutes);
app.route('/api', publicApiRoutes);

app.get('/assets/*', (c) => c.env.ASSETS.fetch(c.req.raw));

/** Vite `public/` copies (stable URLs for crawlers and default `favicon.ico` lookups). */
app.get('/favicon.svg', (c) => c.env.ASSETS.fetch(c.req.raw));
app.get('/favicon.ico', (c) => {
  const u = new URL(c.req.url);
  u.pathname = '/favicon.svg';
  return c.redirect(u.toString(), 302);
});
app.get('/og-image.svg', (c) => c.env.ASSETS.fetch(c.req.raw));

app.get('/index.html', (c) => c.env.ASSETS.fetch(c.req.raw));

/**
 * SPA routes (`/admin/*`, `/docs/*`) — bundles under `/assets/*`; unknown paths fall back to `index.html`.
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

app.get('/admin', serveSpaFallback);
app.get('/admin/*', serveSpaFallback);
app.get('/docs', serveSpaFallback);
app.get('/docs/*', serveSpaFallback);
app.get('/health', serveSpaFallback);
app.get('/health/*', serveSpaFallback);

app.all('*', (c) => proxyHandler(c));

export default app;
