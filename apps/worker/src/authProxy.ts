import { Hono } from 'hono';
import { Env } from './env';

// Placeholder auth proxy routes – can be expanded later to verify JWTs, etc.
export const authProxyRoutes = new Hono<{ Bindings: Env }>();

// Example health endpoint
authProxyRoutes.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Fallback for unknown paths
authProxyRoutes.all('*', (c) => {
  return c.json({ error: 'Not found' }, 404);
});
