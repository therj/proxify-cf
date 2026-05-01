import { Hono } from 'hono';
import type { Env } from '../env';
import { SYS_HEALTH_PROBE } from '../cache/keys';

/** All liveness / readiness endpoints live under `/health` (not under `/admin`). */
export const healthRoutes = new Hono<{ Bindings: Env }>();

type CheckResult = { ok: true; latency_ms: number } | { ok: false; latency_ms: number; error: string };

async function checkD1(db: D1Database): Promise<CheckResult> {
  const t0 = performance.now();
  try {
    await db.prepare('SELECT 1').first();
    return { ok: true, latency_ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return {
      ok: false,
      latency_ms: Math.round(performance.now() - t0),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Read-only probe: `get` may return null; failure only on thrown errors. */
async function checkKV(kv: KVNamespace | undefined): Promise<CheckResult> {
  if (kv == null) {
    return {
      ok: false,
      latency_ms: 0,
      error:
        'KV binding is missing; wrangler [[kv_namespaces]] binding must be "proxify_cache" to match env',
    };
  }
  const t0 = performance.now();
  try {
    await kv.get(SYS_HEALTH_PROBE, { type: 'text' });
    return { ok: true, latency_ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return {
      ok: false,
      latency_ms: Math.round(performance.now() - t0),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

healthRoutes.get('/', async (c) => {
  const [d1, kv] = await Promise.all([checkD1(c.env.DB), checkKV(c.env.proxify_cache)]);

  const allOk = d1.ok && kv.ok;
  const body = {
    status: allOk ? 'ok' : 'degraded',
    checks: {
      d1,
      kv,
    },
  };

  return c.json(body, allOk ? 200 : 503);
});
