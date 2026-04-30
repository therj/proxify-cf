import { AuditLog } from '@proxify-cf/shared';

export async function getAuditLogs(db: D1Database): Promise<AuditLog[]> {
  const { results } = await db.prepare('SELECT * FROM audit_log ORDER BY ts DESC LIMIT 100').all<AuditLog>();
  return results;
}

export async function appendAudit(
    db: D1Database, 
    actor: string, 
    action: string, 
    target: string, 
    meta?: any
): Promise<void> {
    const id = crypto.randomUUID();
    const ts = Date.now();
    await db.prepare(
        `INSERT INTO audit_log (id, ts, actor, action, target, meta) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    ).bind(id, ts, actor, action, target, meta ? JSON.stringify(meta) : null).run();
}
