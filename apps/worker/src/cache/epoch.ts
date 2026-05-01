import * as K from './keys';

export async function getCfgEpoch(kv: KVNamespace): Promise<number> {
  const v = await kv.get(K.META_CFG_EPOCH);
  if (v == null || v === '') return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}
