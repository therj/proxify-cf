import { Hono, type Context } from 'hono';
import { adminRoutes } from './admin/routes';
import { proxyHandler } from './proxy/handler';
import { Env } from './env';
import { findRouteForRequest } from './repo/routes';
import { healthRoutes } from './health/routes';

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
  const proxyRoute = await findRouteForRequest(c.env.DB, host, '/');
  if (proxyRoute) {
    return proxyHandler(c);
  }
  return fetchSpaShell(c);
});

app.route('/admin/api/v1', adminRoutes);
app.route('/health', healthRoutes);

app.get('/assets/*', (c) => c.env.ASSETS.fetch(c.req.raw));

app.get('/index.html', (c) => c.env.ASSETS.fetch(c.req.raw));

/**
 * SPA routes (`/admin/*`, `/docs/*`) — bundles under `/assets/*`; unknown paths fall back to `index.html`.
 */
const serveSpaFallback = async (c: Context<{ Bindings: Env }>) => {
  const url = new URL(c.req.url);
  const path = url.pathname;

  if (path.startsWith('/admin/api')) {
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

app.all('*', proxyHandler);

export default app;
