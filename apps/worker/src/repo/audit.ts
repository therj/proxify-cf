import { AuditLog } from '@proxify-cf/shared';

export type AuditLogFilters = {
  client_id?: string | null;
  action?: string | null;
  target_like?: string | null;
  kid?: string | null;
  route_id?: string | null;
  since?: number | null;
  until?: number | null;
  limit?: number;
  offset?: number;
};

export type AppendAuditOpts = {
  client_id?: string | null;
  kid?: string | null;
  route_id?: string | null;
};

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function getAuditLogs(db: D1Database, filters: AuditLogFilters = {}): Promise<AuditLog[]> {
  let i = 1;
  const conditions: string[] = [];
  const binds: unknown[] = [];

  if (filters.client_id) {
    conditions.push(`client_id = ?${i}`);
    binds.push(filters.client_id);
    i++;
  }
  if (filters.action) {
    conditions.push(`action = ?${i}`);
    binds.push(filters.action);
    i++;
  }
  if (filters.target_like) {
    conditions.push(`target LIKE ?${i}`);
    binds.push(`%${filters.target_like}%`);
    i++;
  }
  if (filters.kid) {
    conditions.push(`(kid = ?${i} OR (kid IS NULL AND target = ?${i + 1}))`);
    binds.push(filters.kid, filters.kid);
    i += 2;
  }
  if (filters.route_id) {
    conditions.push(`route_id = ?${i}`);
    binds.push(filters.route_id);
    i++;
  }
  if (filters.since != null && filters.since > 0) {
    conditions.push(`ts >= ?${i}`);
    binds.push(filters.since);
    i++;
  }
  if (filters.until != null && filters.until > 0) {
    conditions.push(`ts <= ?${i}`);
    binds.push(filters.until);
    i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(filters.offset ?? 0, 0);

  const limPh = `?${i}`;
  const offPh = `?${i + 1}`;
  binds.push(limit, offset);
  const sql = `SELECT * FROM audit_log ${where} ORDER BY ts DESC LIMIT ${limPh} OFFSET ${offPh}`;

  const { results } = await db.prepare(sql).bind(...binds).all<AuditLog>();
  return results ?? [];
}

export async function countAuditLogs(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS c FROM audit_log').first<{ c: number }>();
  return Number(row?.c ?? 0);
}

export async function getDistinctAuditActions(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT DISTINCT action FROM audit_log ORDER BY action ASC')
    .all<{ action: string }>();
  const rows = results ?? [];
  return rows.map((r) => r.action);
}

export async function appendAudit(
  db: D1Database,
  actor: string,
  action: string,
  target: string,
  meta?: unknown,
  opts?: AppendAuditOpts
): Promise<void> {
  const id = crypto.randomUUID();
  const ts = Date.now();
  const client_id = opts?.client_id ?? null;
  const kid = opts?.kid ?? null;
  const route_id = opts?.route_id ?? null;
  await db
    .prepare(
      `INSERT INTO audit_log (id, ts, actor, action, target, meta, client_id, kid, route_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
    )
    .bind(
      id,
      ts,
      actor,
      action,
      target,
      meta !== undefined && meta !== null ? JSON.stringify(meta) : null,
      client_id,
      kid,
      route_id
    )
    .run();
}
