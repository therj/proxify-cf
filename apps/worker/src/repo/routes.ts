import { Route } from '@proxify-cf/shared';

export async function getRoutes(db: D1Database): Promise<Route[]> {
  const { results } = await db.prepare('SELECT * FROM routes ORDER BY created_at DESC').all<Route>();
  return results;
}

export async function createRoute(
  db: D1Database, 
  data: Omit<Route, 'id' | 'created_at' | 'disabled_at'>
): Promise<Route> {
  const id = crypto.randomUUID();
  const created_at = Date.now();

  await db.prepare(
    `INSERT INTO routes (id, host, path_prefix, upstream_url, preserve_path, preserve_query, preserve_method, forward_body, timeout_ms, created_at) 
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
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

export async function removeRouteHeader(db: D1Database, header_id: string): Promise<void> {
  const [route_id, ...rest] = header_id.split(':');
  const header_name = rest.join(':');
  await db.prepare('DELETE FROM route_headers WHERE route_id = ?1 AND header_name = ?2').bind(route_id, header_name).run();
}
