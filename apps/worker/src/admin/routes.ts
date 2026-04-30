import { Hono } from 'hono';
import { Env } from '../env';
import { getRoutes, createRoute, updateRoute, deleteRoute, getRouteHeaders, addRouteHeader, removeRouteHeader } from '../repo/routes';
import { getClients, createClient, updateClient } from '../repo/clients';
import { getKeys, createKey, revokeKey, getIssuedTokens, mintToken, revokeToken } from '../repo/keys';
import { getGrants, createGrant, revokeGrant } from '../repo/grants';
import { getAuditLogs, appendAudit } from '../repo/audit';

export const adminRoutes = new Hono<{ Bindings: Env }>();

adminRoutes.get('/health', (c) => c.json({ status: 'ok' }));

// --- Routes API ---
adminRoutes.get('/routes', async (c) => {
  try {
    const routes = await getRoutes(c.env.DB);
    return c.json({ data: routes });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/routes', async (c) => {
  try {
    const body = await c.req.json();
    const route = await createRoute(c.env.DB, body);
    await appendAudit(c.env.DB, 'admin', 'CREATE_ROUTE', `${route.host}${route.path_prefix !== '/' ? route.path_prefix : ''}`, body);
    return c.json({ data: route }, 201);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.put('/routes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const route = await updateRoute(c.env.DB, id, body);
    await appendAudit(c.env.DB, 'admin', 'UPDATE_ROUTE', `${route.host}${route.path_prefix !== '/' ? route.path_prefix : ''}`, body);
    return c.json({ data: route });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.delete('/routes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const routeList = await getRoutes(c.env.DB);
    const route = routeList.find(r => r.id === id);
    const targetName = route ? `${route.host}${route.path_prefix !== '/' ? route.path_prefix : ''}` : id;
    
    await deleteRoute(c.env.DB, id);
    await appendAudit(c.env.DB, 'admin', 'DELETE_ROUTE', targetName, { id });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.get('/routes/:id/headers', async (c) => {
  try {
    const id = c.req.param('id');
    const headers = await getRouteHeaders(c.env.DB, id);
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
    await appendAudit(c.env.DB, 'admin', 'ADD_ROUTE_HEADER', `Header "${body.header_name}"`, body);
    return c.json({ data: header }, 201);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.delete('/routes/headers/:header_id', async (c) => {
  try {
    const header_id = c.req.param('header_id');
    await removeRouteHeader(c.env.DB, header_id);
    await appendAudit(c.env.DB, 'admin', 'REMOVE_ROUTE_HEADER', header_id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// --- Clients API ---
adminRoutes.get('/clients', async (c) => {
  try {
    const clients = await getClients(c.env.DB);
    return c.json({ data: clients });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/clients', async (c) => {
  try {
    const body = await c.req.json();
    const client = await createClient(c.env.DB, body);
    await appendAudit(c.env.DB, 'admin', 'CREATE_CLIENT', client.name, body);
    return c.json({ data: client }, 201);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.put('/clients/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const client = await updateClient(c.env.DB, id, body);
    await appendAudit(c.env.DB, 'admin', 'UPDATE_CLIENT', client.name, body);
    return c.json({ data: client });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// --- Keys & issued tokens API ---
adminRoutes.get('/keys', async (c) => {
  try {
    const keys = await getKeys(c.env.DB);
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
    });
    return c.json({ data: { key, privateJwk } }, 201);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/keys/:kid/revoke', async (c) => {
  try {
    const kid = c.req.param('kid');
    await revokeKey(c.env.DB, kid);
    await appendAudit(c.env.DB, 'admin', 'REVOKE_KEY', kid);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.get('/tokens', async (c) => {
  try {
    const tokens = await getIssuedTokens(c.env.DB);
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
    });
    return c.json({ data: { token, issued } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/tokens/:jti/revoke', async (c) => {
  try {
    const jti = c.req.param('jti');
    await revokeToken(c.env.DB, jti);
    await appendAudit(c.env.DB, 'admin', 'REVOKE_TOKEN', jti);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// --- Grants API ---
adminRoutes.get('/grants', async (c) => {
  try {
    const grants = await getGrants(c.env.DB);
    return c.json({ data: grants });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.post('/grants', async (c) => {
  try {
    const body = await c.req.json();
    const grant = await createGrant(c.env.DB, body.client_id, body.route_id);
    await appendAudit(c.env.DB, 'admin', 'CREATE_GRANT', `Grant (Client ${body.client_id.slice(0,8)})`, body);
    return c.json({ data: grant }, 201);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

adminRoutes.delete('/grants/:client_id/:route_id', async (c) => {
  try {
    const client_id = c.req.param('client_id');
    const route_id = c.req.param('route_id');
    await revokeGrant(c.env.DB, client_id, route_id);
    await appendAudit(c.env.DB, 'admin', 'REVOKE_GRANT', `${client_id}:${route_id}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// --- Audit API ---
adminRoutes.get('/audit', async (c) => {
  try {
    const logs = await getAuditLogs(c.env.DB);
    return c.json({ data: logs });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});
