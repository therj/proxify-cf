import { Client } from '@proxify-cf/shared';

export async function getClients(db: D1Database): Promise<Client[]> {
  const { results } = await db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all<Client>();
  return results;
}

export async function createClient(
  db: D1Database, 
  data: Omit<Client, 'id' | 'created_at' | 'created_by' | 'disabled_at'>
): Promise<Client> {
  const id = crypto.randomUUID();
  const created_at = Date.now();
  const created_by = 'admin'; // Hardcoded for now, should come from context

  await db.prepare(
    `INSERT INTO clients (id, name, email, description, created_at, created_by) 
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  ).bind(
    id, 
    data.name, 
    data.email, 
    data.description || null, 
    created_at,
    created_by
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
