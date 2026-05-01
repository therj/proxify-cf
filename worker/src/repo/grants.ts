import { ClientRouteGrant } from '@proxify-cf/shared';

export type GrantsFilters = { client_id?: string | null; route_id?: string | null };

export async function getGrants(db: D1Database, filters: GrantsFilters = {}): Promise<ClientRouteGrant[]> {
  const conditions: string[] = [];
  const binds: unknown[] = [];
  let i = 1;
  if (filters.client_id) {
    conditions.push(`client_id = ?${i}`);
    binds.push(filters.client_id);
    i++;
  }
  if (filters.route_id) {
    conditions.push(`route_id = ?${i}`);
    binds.push(filters.route_id);
    i++;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { results } = await db
    .prepare(`SELECT * FROM client_route_grants ${where} ORDER BY granted_at DESC`)
    .bind(...binds)
    .all<ClientRouteGrant>();
  return results ?? [];
}

export async function createGrant(
  db: D1Database, 
  client_id: string,
  route_id: string
): Promise<ClientRouteGrant> {
  const granted_at = Date.now();
  const granted_by = 'admin'; // Hardcoded for now

  await db.prepare(
    `INSERT INTO client_route_grants (client_id, route_id, granted_at, granted_by) 
     VALUES (?1, ?2, ?3, ?4)`
  ).bind(client_id, route_id, granted_at, granted_by).run();

  const { results } = await db.prepare(
    'SELECT * FROM client_route_grants WHERE client_id = ?1 AND route_id = ?2'
  ).bind(client_id, route_id).all<ClientRouteGrant>();
  
  return results[0];
}

export async function revokeGrant(db: D1Database, client_id: string, route_id: string): Promise<void> {
  await db.prepare(`DELETE FROM client_route_grants WHERE client_id = ?1 AND route_id = ?2`).bind(client_id, route_id).run();
}

export async function hasGrant(db: D1Database, client_id: string, route_id: string): Promise<boolean> {
  const res = await db
    .prepare(
      `SELECT 1 AS ok FROM client_route_grants WHERE client_id = ?1 AND route_id = ?2 LIMIT 1`
    )
    .bind(client_id, route_id)
    .all<{ ok: number }>();
  const rows = res.results;
  return Array.isArray(rows) && rows.length > 0;
}
