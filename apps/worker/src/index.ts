import { Hono, type Context } from 'hono';
import { adminRoutes } from './admin/routes';
import { proxyHandler } from './proxy/handler';
import { Env } from './env';
import { HOME_HTML } from './homeHtml';
import { findRouteForRequest } from './repo/routes';

const app = new Hono<{ Bindings: Env }>();

// Public landing OR reverse-proxy when Host/path matches a configured route (e.g. proxy hostname + `/`)
app.get('/', async (c) => {
  const host = c.req.header('Host') ?? '';
  const proxyRoute = await findRouteForRequest(c.env.DB, host, '/');
  if (proxyRoute) {
    return proxyHandler(c);
  }
  return c.html(HOME_HTML);
});

// Admin panel JSON API
app.route('/admin/api/v1', adminRoutes);

// Liveness for monitors (must be registered before `/admin/*` static assets)
app.get('/admin/health', (c) => c.json({ status: 'ok' }));

// Admin SPA + static files (Vite base `/admin/` → dist/admin/...)
// Fetching `GET /admin` via ASSETS alone often returns 307 → `/admin/`, which can loop with the SPA;
// serve the shell directly as `/admin/index.html` instead.
const serveAdminAssets = (c: Context<{ Bindings: Env }>) => {
  const url = new URL(c.req.url);
  if (url.pathname === '/admin') {
    url.pathname = '/admin/index.html';
    return c.env.ASSETS.fetch(new Request(url, c.req));
  }
  return c.env.ASSETS.fetch(c.req.raw);
};

app.get('/admin', serveAdminAssets);
app.get('/admin/*', serveAdminAssets);

// Catch‑all for any other proxying (e.g., custom host routing)
app.all('*', proxyHandler);

export default app;

