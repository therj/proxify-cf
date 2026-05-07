import { Env } from '../env';

export async function runDemoCleanup(env: Env): Promise<void> {
  const retentionStr = env.DEMO_CLEANUP_RETENTION_MINUTES;
  if (!retentionStr) return;

  const retentionMinutes = parseInt(retentionStr, 10);
  if (isNaN(retentionMinutes) || retentionMinutes <= 0) {
    return;
  }

  const cutoffMs = Date.now() - retentionMinutes * 60 * 1000;
  const db = env.DB;

  console.log(`[Cron] Running demo cleanup. Deleting data older than ${retentionMinutes} minutes (cutoff: ${cutoffMs})`);

  try {
    // D1 batch ensures ordered execution. We must delete in reverse-dependency order.
    // We use a rolling cutoff across all tables. If a parent (client/route) is deleted,
    // all its children must be deleted regardless of the child's age to avoid FK violations.
    await db.batch([
      db.prepare('DELETE FROM access_log WHERE ts < ?').bind(cutoffMs),
      db.prepare('DELETE FROM audit_log WHERE ts < ?').bind(cutoffMs),
      
      // Tokens depend on keys and clients
      db.prepare(
        'DELETE FROM issued_tokens WHERE issued_at < ? OR client_id IN (SELECT id FROM clients WHERE created_at < ?)'
      ).bind(cutoffMs, cutoffMs),
      
      // Grants depend on clients and routes
      db.prepare(
        'DELETE FROM client_route_grants WHERE granted_at < ? OR client_id IN (SELECT id FROM clients WHERE created_at < ?) OR route_id IN (SELECT id FROM routes WHERE created_at < ?)'
      ).bind(cutoffMs, cutoffMs, cutoffMs),
      
      // Route headers depend on routes
      db.prepare(
        'DELETE FROM route_headers WHERE route_id IN (SELECT id FROM routes WHERE created_at < ?)'
      ).bind(cutoffMs),
      
      // Keys depend on clients
      db.prepare(
        'DELETE FROM keys WHERE created_at < ? OR client_id IN (SELECT id FROM clients WHERE created_at < ?)'
      ).bind(cutoffMs, cutoffMs),
      
      // Routes have no FK parents
      db.prepare('DELETE FROM routes WHERE created_at < ?').bind(cutoffMs),
      
      // Clients have no FK parents
      db.prepare('DELETE FROM clients WHERE created_at < ?').bind(cutoffMs),
    ]);

    console.log('[Cron] Demo cleanup completed successfully.');
  } catch (error) {
    console.error('[Cron] Demo cleanup failed:', error);
  }
}
