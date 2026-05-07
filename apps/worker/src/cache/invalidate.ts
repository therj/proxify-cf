import * as K from './keys';
import { getCfgEpoch } from './epoch';
import { safeKvPut } from './safeKv';

export type PurgeScope = 'all' | 'metadata';

/**
 * Bump cfg epoch so cached keys (which embed the old epoch) become unreachable.
 * KV has no prefix-delete; orphans expire via per-key TTL.
 */
export async function purgeCache(kv: KVNamespace, scope: PurgeScope): Promise<{ cfg_epoch: number }> {
  void scope; // 'all' and 'metadata' are equivalent (single epoch)
  const cfg = await getCfgEpoch(kv);
  const nextCfg = cfg + 1;
  await safeKvPut(kv, K.META_CFG_EPOCH, String(nextCfg));
  return { cfg_epoch: nextCfg };
}

/** After admin changes that affect cached routing, authz, key material, or admin list payloads. */
export async function bumpAfterProxyMutation(kv: KVNamespace): Promise<void> {
  await purgeCache(kv, 'all');
}
