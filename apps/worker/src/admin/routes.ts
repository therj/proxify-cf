import { Hono } from 'hono';
import { z } from 'zod';
import { Env } from '../env';
import { getCfgEpoch } from '../cache/epoch';
import { cachedAdminGetJson, adminRequestCacheKey } from '../cache/adminApi';
import { bumpAfterProxyMutation, purgeCache } from '../cache/invalidate';
import {
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  getRouteHeaders,
  addRouteHeader,
  updateRouteHeaderValue,
  removeRouteHeader,
  getRouteById,
  getRouteHeaderContext,
} from '../repo/routes';
import { getClients, createClient, updateClient, getClientById } from '../repo/clients';
import {
  getKeys,
  createKey,
  revokeKey,
  getIssuedTokens,
  mintToken,
  revokeToken,
  getKeyByKid,
  getIssuedTokenByJti,
} from '../repo/keys';
import { getGrants, createGrant, revokeGrant } from '../repo/grants';
import { getAuditLogs, appendAudit, getDistinctAuditActions, type AuditLogFilters } from '../repo/audit';
import { listAccessLogs, type AccessLogFilters } from '../repo/accessLog';

export const adminRoutes = new Hono<{ Bindings: Env }>();

function routeLabel(host: string, path_prefix: string): string {
  return `${host}${path_prefix !== '/' ? path_prefix : ''}`;
}

const cachePurgeBodySchema = z.object({
  scope: z.enum(['all', 'metadata']),
});

adminRoutes.post('/cache/purge', async (c) => {
  try {
    const raw = await c.req.json();
    const parsed = cachePurgeBodySchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'body.scope must be one of: all, metadata' }, 400);
    }
    const result = await purgeCache(c.env.proxify_cache, parsed.data.scope);
    await appendAudit(c.env.DB, 'admin', 'CACHE_PURGE', parsed.data.scope, result);
    return c.json({ data: result });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// --- Routes API ---
adminRoutes.get('/routes', async (c) => {
  try {
    const cfgEpoch = await getCfgEpoch(c.env.proxify_cache);
    const cacheKey = adminRequestCacheKey(c);
    const routes = await cachedAdminGetJson(c.env.proxify_cache, cfgEpoch, cacheKey, () =>
      getRoutes(c.env.DB)
    );
    return c.json({ data: routes });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/routes', async (c) => {
  try {
    const body = await c.req.json();
    const route = await createRoute(c.env.DB, body);
    await appendAudit(c.env.DB, 'admin', 'CREATE_ROUTE', routeLabel(route.host, route.path_prefix), body, {
      route_id: route.id,
    });
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ data: route }, 201);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.put('/routes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const before = await getRouteById(c.env.DB, id);
    const route = await updateRoute(c.env.DB, id, body);
    await appendAudit(c.env.DB, 'admin', 'UPDATE_ROUTE', routeLabel(route.host, route.path_prefix), {
      before: before ?? undefined,
      after: body,
    }, { route_id: id });
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ data: route });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.delete('/routes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const routeList = await getRoutes(c.env.DB);
    const route = routeList.find((r) => r.id === id);
    const targetName = route ? routeLabel(route.host, route.path_prefix) : id;

    await deleteRoute(c.env.DB, id);
    await appendAudit(c.env.DB, 'admin', 'DELETE_ROUTE', targetName, { id }, { route_id: id });
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.get('/routes/:id/headers', async (c) => {
  try {
    const id = c.req.param('id');
    const cfgEpoch = await getCfgEpoch(c.env.proxify_cache);
    const cacheKey = adminRequestCacheKey(c);
    const headers = await cachedAdminGetJson(c.env.proxify_cache, cfgEpoch, cacheKey, () =>
      getRouteHeaders(c.env.DB, id)
    );
    return c.json({ data: headers });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/routes/:id/headers', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const header = await addRouteHeader(c.env.DB, id, body.header_name, body.header_value);
    const rt = await getRouteById(c.env.DB, id);
    const meta = {
      route_id: id,
      host: rt?.host,
      path_prefix: rt?.path_prefix,
      header_name: body.header_name,
      header_value: body.header_value,
    };
    await appendAudit(
      c.env.DB,
      'admin',
      'ADD_ROUTE_HEADER',
      rt ? `Header "${body.header_name}" on ${routeLabel(rt.host, rt.path_prefix)}` : `Header "${body.header_name}"`,
      meta,
      { route_id: id }
    );
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ data: header }, 201);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.put('/routes/headers/:header_id', async (c) => {
  try {
    const header_id = c.req.param('header_id');
    const body = await c.req.json();
    const header_value = body.header_value as string;
    if (typeof header_value !== 'string') {
      return c.json({ error: 'header_value required' }, 400);
    }
    await updateRouteHeaderValue(c.env.DB, header_id, header_value);
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.delete('/routes/headers/:header_id', async (c) => {
  try {
    const header_id = c.req.param('header_id');
    const [route_id, ...rest] = header_id.split(':');
    const header_name = rest.join(':');
    const ctx =
      route_id && header_name ? await getRouteHeaderContext(c.env.DB, route_id, header_name) : null;
    await removeRouteHeader(c.env.DB, header_id);
    const meta = ctx
      ? {
          route_id,
          header_name: ctx.header_name,
          header_value: ctx.header_value,
          host: ctx.host,
          path_prefix: ctx.path_prefix,
        }
      : { header_id };
    const target = ctx
      ? `Removed "${ctx.header_name}" from ${routeLabel(ctx.host, ctx.path_prefix)}`
      : header_id;
    await appendAudit(c.env.DB, 'admin', 'REMOVE_ROUTE_HEADER', target, meta, route_id ? { route_id } : undefined);
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// --- Clients API ---
adminRoutes.get('/clients', async (c) => {
  try {
    const cfgEpoch = await getCfgEpoch(c.env.proxify_cache);
    const cacheKey = adminRequestCacheKey(c);
    const clients = await cachedAdminGetJson(c.env.proxify_cache, cfgEpoch, cacheKey, () =>
      getClients(c.env.DB)
    );
    return c.json({ data: clients });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/clients', async (c) => {
  try {
    const body = await c.req.json();
    const client = await createClient(c.env.DB, body);
    await appendAudit(c.env.DB, 'admin', 'CREATE_CLIENT', client.name, body, { client_id: client.id });
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ data: client }, 201);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.put('/clients/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const before = await getClientById(c.env.DB, id);
    const client = await updateClient(c.env.DB, id, body);
    await appendAudit(
      c.env.DB,
      'admin',
      'UPDATE_CLIENT',
      client.name,
      {
        before: before
          ? {
              name: before.name,
              email: before.email,
              description: before.description,
              disabled_at: before.disabled_at,
            }
          : undefined,
        after: body,
      },
      { client_id: client.id }
    );
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ data: client });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// --- Keys & issued tokens API ---
adminRoutes.get('/keys', async (c) => {
  try {
    const client_id = c.req.query('client_id') || undefined;
    const cfgEpoch = await getCfgEpoch(c.env.proxify_cache);
    const cacheKey = adminRequestCacheKey(c);
    const keys = await cachedAdminGetJson(c.env.proxify_cache, cfgEpoch, cacheKey, () =>
      getKeys(c.env.DB, { client_id: client_id || null })
    );
    return c.json({ data: keys });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/keys', async (c) => {
  try {
    const body = await c.req.json();
    const { key, privateJwk } = await createKey(c.env.DB, body, c.env.KEK);
    await appendAudit(c.env.DB, 'admin', 'CREATE_KEY', key.kid, {
      client_id: key.client_id,
      mode: key.mode,
    }, { client_id: key.client_id, kid: key.kid });
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ data: { key, privateJwk } }, 201);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/keys/:kid/revoke', async (c) => {
  try {
    const kid = c.req.param('kid');
    const row = await getKeyByKid(c.env.DB, kid);
    await revokeKey(c.env.DB, kid);
    await appendAudit(
      c.env.DB,
      'admin',
      'REVOKE_KEY',
      kid,
      row ? { kid, client_id: row.client_id, alg: row.alg, mode: row.mode } : { kid },
      { client_id: row?.client_id ?? null, kid }
    );
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.get('/tokens', async (c) => {
  try {
    const cfgEpoch = await getCfgEpoch(c.env.proxify_cache);
    const cacheKey = adminRequestCacheKey(c);
    const tokens = await cachedAdminGetJson(c.env.proxify_cache, cfgEpoch, cacheKey, () =>
      getIssuedTokens(c.env.DB)
    );
    return c.json({ data: tokens });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/keys/:kid/tokens', async (c) => {
  try {
    const kid = c.req.param('kid');
    const body = await c.req.json();
    const client_id = body.client_id as string;
    const label = (body.label as string) ?? 'token';
    const expires_in_days = (body.expires_in_days as number) ?? 30;
    const { token, issued } = await mintToken(
      c.env.DB,
      kid,
      client_id,
      label,
      expires_in_days,
      c.env.KEK
    );
    await appendAudit(c.env.DB, 'admin', 'MINT_TOKEN', issued.jti, {
      label,
      client_id,
      kid,
    }, { client_id, kid });
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ data: { token, issued } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/tokens/:jti/revoke', async (c) => {
  try {
    const jti = c.req.param('jti');
    const issued = await getIssuedTokenByJti(c.env.DB, jti);
    await revokeToken(c.env.DB, jti);
    await appendAudit(
      c.env.DB,
      'admin',
      'REVOKE_TOKEN',
      jti,
      issued
        ? { jti, client_id: issued.client_id, kid: issued.kid, label: issued.label }
        : { jti },
      { client_id: issued?.client_id ?? null, kid: issued?.kid ?? null }
    );
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// --- Grants API ---
adminRoutes.get('/grants', async (c) => {
  try {
    const client_id = c.req.query('client_id') || undefined;
    const route_id = c.req.query('route_id') || undefined;
    const cfgEpoch = await getCfgEpoch(c.env.proxify_cache);
    const cacheKey = adminRequestCacheKey(c);
    const grants = await cachedAdminGetJson(c.env.proxify_cache, cfgEpoch, cacheKey, () =>
      getGrants(c.env.DB, {
        client_id: client_id || null,
        route_id: route_id || null,
      })
    );
    return c.json({ data: grants });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/grants', async (c) => {
  try {
    const body = await c.req.json();
    const grant = await createGrant(c.env.DB, body.client_id, body.route_id);
    const routes = await getRoutes(c.env.DB);
    const rt = routes.find((r) => r.id === body.route_id);
    const target = rt
      ? `Access to ${routeLabel(rt.host, rt.path_prefix)}`
      : `Grant route ${body.route_id}`;
    await appendAudit(c.env.DB, 'admin', 'CREATE_GRANT', target, body, {
      client_id: body.client_id,
      route_id: body.route_id,
    });
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ data: grant }, 201);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.delete('/grants/:client_id/:route_id', async (c) => {
  try {
    const client_id = c.req.param('client_id');
    const route_id = c.req.param('route_id');
    const rt = await getRouteById(c.env.DB, route_id);
    await revokeGrant(c.env.DB, client_id, route_id);
    const target = rt ? `Revoked ${routeLabel(rt.host, rt.path_prefix)}` : `Revoked route ${route_id}`;
    await appendAudit(c.env.DB, 'admin', 'REVOKE_GRANT', target, { client_id, route_id }, { client_id, route_id });
    await bumpAfterProxyMutation(c.env.proxify_cache);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

function parseAccessFilters(c: { req: { query: (k: string) => string | undefined } }): AccessLogFilters {
  const client_id = c.req.query('client_id') || undefined;
  const route_id = c.req.query('route_id') || undefined;
  const kid = c.req.query('kid') || undefined;
  const outcome = c.req.query('outcome') || undefined;
  const sinceRaw = c.req.query('since');
  const untilRaw = c.req.query('until');
  const limitRaw = c.req.query('limit');
  const offsetRaw = c.req.query('offset');
  const since = sinceRaw !== undefined ? Number(sinceRaw) : undefined;
  const until = untilRaw !== undefined ? Number(untilRaw) : undefined;
  const limit = limitRaw !== undefined ? Number(limitRaw) : undefined;
  const offset = offsetRaw !== undefined ? Number(offsetRaw) : undefined;
  return {
    client_id: client_id || null,
    route_id: route_id || null,
    kid: kid || null,
    outcome: outcome || null,
    since: Number.isFinite(since as number) ? since : undefined,
    until: Number.isFinite(until as number) ? until : undefined,
    limit: Number.isFinite(limit as number) ? limit : undefined,
    offset: Number.isFinite(offset as number) ? offset : undefined,
  };
}

function parseAuditFilters(c: { req: { query: (k: string) => string | undefined } }): AuditLogFilters {
  const client_id = c.req.query('client_id') || undefined;
  const action = c.req.query('action') || undefined;
  const target = c.req.query('target') || undefined;
  const kid = c.req.query('kid') || undefined;
  const route_id = c.req.query('route_id') || undefined;
  const limitRaw = c.req.query('limit');
  const offsetRaw = c.req.query('offset');
  const limit = limitRaw !== undefined ? Number(limitRaw) : undefined;
  const offset = offsetRaw !== undefined ? Number(offsetRaw) : undefined;
  return {
    client_id: client_id || null,
    action: action || null,
    target_like: target || null,
    kid: kid || null,
    route_id: route_id || null,
    limit: Number.isFinite(limit as number) ? limit : undefined,
    offset: Number.isFinite(offset as number) ? offset : undefined,
  };
}

// --- Access logs API (D1 only; not KV-cached) ---
adminRoutes.get('/access', async (c) => {
  try {
    const logs = await listAccessLogs(c.env.DB, parseAccessFilters(c));
    return c.json({ data: logs });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// --- Audit API ---
adminRoutes.get('/audit/actions', async (c) => {
  try {
    const actions = await getDistinctAuditActions(c.env.DB);
    return c.json({ data: actions });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.get('/audit', async (c) => {
  try {
    const logs = await getAuditLogs(c.env.DB, parseAuditFilters(c));
    return c.json({ data: logs });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});
