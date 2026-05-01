/**
 * KV expiration for cached reads (proxy metadata + admin JSON).
 * Logical invalidation uses `cfg_epoch` bumps on mutations; TTL is only a safety net for orphans.
 */
export const KV_CACHE_TTL_SEC = 4 * 60 * 60; // 4 hours
