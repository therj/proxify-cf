import type { AccessLog, AccessOutcome } from '@proxify-cf/shared';

export type AccessLogFilters = {
  client_id?: string | null;
  route_id?: string | null;
  kid?: string | null;
  outcome?: string | null;
  since?: number | null;
  until?: number | null;
  limit?: number;
  offset?: number;
};

export type NewAccessLog = {
  host: string;
  path: string;
  method: string;
  route_id?: string | null;
  client_id?: string | null;
  kid?: string | null;
  jti?: string | null;
  outcome: AccessOutcome;
  upstream_status?: number | null;
  latency_ms?: number | null;
  client_ip?: string | null;
  detail?: unknown;
};

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

const DETAIL_MAX = 512;

function truncateDetail(detail: unknown): string | null {
  if (detail === undefined || detail === null) return null;
  try {
    const s = typeof detail === 'string' ? detail : JSON.stringify(detail);
    return s.length > DETAIL_MAX ? s.slice(0, DETAIL_MAX) + '…' : s;
  } catch {
    return null;
  }
}

export async function appendAccessLog(db: D1Database, row: NewAccessLog): Promise<void> {
  const id = crypto.randomUUID();
  const ts = Date.now();
  await db
    .prepare(
      `INSERT INTO access_log (
        id, ts, host, path, method, route_id, client_id, kid, jti,
        outcome, upstream_status, latency_ms, client_ip, detail
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
    )
    .bind(
      id,
      ts,
      row.host,
      row.path,
      row.method,
      row.route_id ?? null,
      row.client_id ?? null,
      row.kid ?? null,
      row.jti ?? null,
      row.outcome,
      row.upstream_status ?? null,
      row.latency_ms ?? null,
      row.client_ip ?? null,
      truncateDetail(row.detail)
    )
    .run();
}

export async function listAccessLogs(db: D1Database, filters: AccessLogFilters = {}): Promise<AccessLog[]> {
  let i = 1;
  const conditions: string[] = [];
  const binds: unknown[] = [];

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
  if (filters.kid) {
    conditions.push(`kid = ?${i}`);
    binds.push(filters.kid);
    i++;
  }
  if (filters.outcome) {
    conditions.push(`outcome = ?${i}`);
    binds.push(filters.outcome);
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
  const sql = `SELECT * FROM access_log ${where} ORDER BY ts DESC LIMIT ${limPh} OFFSET ${offPh}`;

  const { results } = await db.prepare(sql).bind(...binds).all<AccessLog>();
  return results ?? [];
}
