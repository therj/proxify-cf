import { Route } from '@proxify-cf/shared';

export async function getRoutes(db: D1Database): Promise<Route[]> {
  const { results } = await db.prepare('SELECT * FROM routes ORDER BY created_at DESC').all<Route>();
  return results;
}

export async function countRoutes(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM routes').first<{ n: number }>();
  return Number(row?.n ?? 0);
}

export async function getRouteById(db: D1Database, id: string): Promise<Route | null> {
  const { results } = await db.prepare('SELECT * FROM routes WHERE id = ?1').bind(id).all<Route>();
  if (!results?.length) return null;
  return results[0];
}

/** Resolve route host/path for a composite header id `route_id:header_name`. */
export async function getRouteHeaderContext(
  db: D1Database,
  route_id: string,
  header_name: string
): Promise<{ header_name: string; header_value: string; host: string; path_prefix: string } | null> {
  const { results } = await db
    .prepare(
      `SELECT rh.header_name, rh.header_value, r.host, r.path_prefix
       FROM route_headers rh
       JOIN routes r ON r.id = rh.route_id
       WHERE rh.route_id = ?1 AND rh.header_name = ?2`
    )
    .bind(route_id, header_name)
    .all<{ header_name: string; header_value: string; host: string; path_prefix: string }>();
  if (!results?.length) return null;
  return results[0];
}

/** Normalize Host header (no port for :443/:80 style matching to stored host). */
export function normalizeIncomingHost(hostHeader: string): string {
  const h = hostHeader.trim().toLowerCase();
  const withoutPort = h.split(':')[0];
  return withoutPort;
}

/**
 * Pick the route for this Worker hostname + path: longest matching path_prefix wins.
 */
export async function findRouteForRequest(
  db: D1Database,
  hostHeader: string,
  pathname: string
): Promise<Route | null> {
  const host = normalizeIncomingHost(hostHeader);
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;

  const res = await db
    .prepare(
      `SELECT * FROM routes
       WHERE lower(host) = ?1 AND disabled_at IS NULL
         AND (
           path_prefix = '/'
           OR (match_subpaths = 1 AND (
                ?2 = path_prefix 
                OR (path_prefix LIKE '%/' AND substr(?2, 1, length(path_prefix)) = path_prefix)
                OR (path_prefix NOT LIKE '%/' AND substr(?2, 1, length(path_prefix)) = path_prefix AND substr(?2, length(path_prefix) + 1, 1) = '/')
              ))
           OR (match_subpaths = 0 AND ?2 = path_prefix)
         )
       ORDER BY length(path_prefix) DESC
       LIMIT 1`
    )
    .bind(host, path)
    .all<Route>();

  const rows = res.results;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
}

/** True when at least one non-disabled route exists for this host (any path_prefix). */
export async function hostHasAnyEnabledRoute(db: D1Database, hostHeader: string): Promise<boolean> {
  const host = normalizeIncomingHost(hostHeader);
  const row = await db
    .prepare('SELECT 1 AS one FROM routes WHERE lower(host) = ?1 AND disabled_at IS NULL LIMIT 1')
    .bind(host)
    .first<{ one: number }>();
  return row != null;
}

export async function createRoute(
  db: D1Database, 
  data: Omit<Route, 'id' | 'created_at' | 'disabled_at'>
): Promise<Route> {
  const id = crypto.randomUUID();
  const created_at = Date.now();

  await db.prepare(
    `INSERT INTO routes (id, host, path_prefix, upstream_url, preserve_path, preserve_query, preserve_method, forward_body, timeout_ms, match_subpaths, strip_prefix, created_at) 
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
  ).bind(
    id, 
    data.host, 
    data.path_prefix || '/', 
    data.upstream_url, 
    data.preserve_path ?? 1, 
    data.preserve_query ?? 1, 
    data.preserve_method ?? 1, 
    data.forward_body ?? 1, 
    data.timeout_ms ?? 10000, 
    data.match_subpaths ?? 0,
    data.strip_prefix ?? 1,
    created_at
  ).run();

  const { results } = await db.prepare('SELECT * FROM routes WHERE id = ?1').bind(id).all<Route>();
  return results[0];
}

export async function updateRoute(
  db: D1Database,
  id: string,
  data: Partial<Omit<Route, 'id' | 'created_at'>>
): Promise<Route> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      updates.push(`${key} = ?${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (updates.length > 0) {
    values.push(id);
    const query = `UPDATE routes SET ${updates.join(', ')} WHERE id = ?${paramIndex}`;
    await db.prepare(query).bind(...values).run();
  }

  const { results } = await db.prepare('SELECT * FROM routes WHERE id = ?1').bind(id).all<Route>();
  return results[0];
}

export async function deleteRoute(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM routes WHERE id = ?1').bind(id).run();
}

export async function getRouteHeaders(db: D1Database, route_id: string): Promise<any[]> {
  const { results } = await db.prepare('SELECT * FROM route_headers WHERE route_id = ?1').bind(route_id).all();
  return results.map((r: any) => ({ ...r, id: `${r.route_id}:${r.header_name}` }));
}

export async function addRouteHeader(
  db: D1Database, 
  route_id: string, 
  header_name: string, 
  header_value: string
): Promise<any> {
  await db.prepare(
    `INSERT INTO route_headers (route_id, header_name, header_value) 
     VALUES (?1, ?2, ?3)`
  ).bind(route_id, header_name, header_value).run();

  const { results } = await db.prepare('SELECT * FROM route_headers WHERE route_id = ?1 AND header_name = ?2').bind(route_id, header_name).all();
  return { ...results[0], id: `${route_id}:${header_name}` };
}

export async function updateRouteHeaderValue(
  db: D1Database,
  header_id: string,
  header_value: string
): Promise<void> {
  const [route_id, ...rest] = header_id.split(':');
  const header_name = rest.join(':');
  if (!route_id || !header_name) throw new Error('Invalid header id');
  await db
    .prepare(
      `UPDATE route_headers SET header_value = ?1 WHERE route_id = ?2 AND header_name = ?3`
    )
    .bind(header_value, route_id, header_name)
    .run();
}

export async function removeRouteHeader(db: D1Database, header_id: string): Promise<void> {
  const [route_id, ...rest] = header_id.split(':');
  const header_name = rest.join(':');
  await db.prepare('DELETE FROM route_headers WHERE route_id = ?1 AND header_name = ?2').bind(route_id, header_name).run();
}
