import { Client } from '@proxify-cf/shared';

export async function getClients(db: D1Database): Promise<Client[]> {
  const { results } = await db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all<Client>();
  return results;
}

export async function countClients(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM clients').first<{ n: number }>();
  return Number(row?.n ?? 0);
}

/** Id → display name for lightweight dashboards (no email/description). */
export async function listClientLabels(db: D1Database): Promise<Record<string, string>> {
  const { results } = await db
    .prepare('SELECT id, name FROM clients')
    .all<{ id: string; name: string }>();
  const out: Record<string, string> = {};
  for (const row of results ?? []) {
    out[row.id] = row.name;
  }
  return out;
}

export async function getClientById(db: D1Database, id: string): Promise<Client | null> {
  const { results } = await db.prepare('SELECT * FROM clients WHERE id = ?1').bind(id).all<Client>();
  if (!results?.length) return null;
  return results[0];
}

/** True when the row exists and is not soft-disabled. */
export async function isClientEnabled(db: D1Database, id: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT disabled_at FROM clients WHERE id = ?1')
    .bind(id)
    .first<{ disabled_at: number | null }>();
  if (!row) return false;
  return row.disabled_at == null;
}

/** Removes dependent rows then the client (access_log.client_id nulls via ON DELETE SET NULL). */
export async function deleteClient(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM issued_tokens WHERE client_id = ?1').bind(id),
    db.prepare('DELETE FROM keys WHERE client_id = ?1').bind(id),
    db.prepare('DELETE FROM client_route_grants WHERE client_id = ?1').bind(id),
    db.prepare('UPDATE audit_log SET client_id = NULL WHERE client_id = ?1').bind(id),
    db.prepare('DELETE FROM clients WHERE id = ?1').bind(id),
  ]);
}

export async function createClient(
  db: D1Database,
  data: Omit<Client, 'id' | 'created_at' | 'created_by' | 'disabled_at'> & { disabled_at?: number | null }
): Promise<Client> {
  const id = crypto.randomUUID();
  const created_at = Date.now();
  const created_by = 'admin'; // Hardcoded for now, should come from context
  const disabled_at = data.disabled_at ?? null;

  await db.prepare(
    `INSERT INTO clients (id, name, email, description, created_at, created_by, disabled_at) 
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  ).bind(
    id,
    data.name,
    data.email,
    data.description || null,
    created_at,
    created_by,
    disabled_at
  ).run();

  const { results } = await db.prepare('SELECT * FROM clients WHERE id = ?1').bind(id).all<Client>();
  return results[0];
}

export async function updateClient(
  db: D1Database,
  id: string,
  data: Partial<Omit<Client, 'id' | 'created_at'>>
): Promise<Client> {
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
    const query = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?${paramIndex}`;
    await db.prepare(query).bind(...values).run();
  }

  const { results } = await db.prepare('SELECT * FROM clients WHERE id = ?1').bind(id).all<Client>();
  return results[0];
}
