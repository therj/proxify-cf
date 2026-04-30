import { Hono, type Context } from 'hono';
import { adminRoutes } from './admin/routes';
import { authProxyRoutes } from './authProxy';
import { proxyHandler } from './proxy/handler';
import { Env } from './env';
import { HOME_HTML } from './homeHtml';

const app = new Hono<{ Bindings: Env }>();

// Public landing (not the React admin build)
app.get('/', (c) => c.html(HOME_HTML));

// Admin panel JSON API
app.route('/admin/api/v1', adminRoutes);

// Token authorization endpoints under /auth-proxy
app.route('/auth-proxy', authProxyRoutes);

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

