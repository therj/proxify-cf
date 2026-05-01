/** Single KV namespace; logical separation via key prefixes. */

export const KV_PREFIX = 'v1';

/** Monotonic generation — bump invalidates metadata + admin API cache keys (keys embed epoch). */
export const META_CFG_EPOCH = `${KV_PREFIX}:meta:cfg_epoch`;

/** Reserved for `/health` KV probe (not tied to epoch purge). */
export const SYS_HEALTH_PROBE = `${KV_PREFIX}:sys:health_probe`;

export function routeLookupKey(cfgEpoch: number, host: string, pathname: string): string {
  return `${KV_PREFIX}:route:${cfgEpoch}:${host}:${pathname}`;
}

export function routeHeadersKey(cfgEpoch: number, routeId: string): string {
  return `${KV_PREFIX}:hdrs:${cfgEpoch}:${routeId}`;
}

export function signingKeyKey(cfgEpoch: number, kid: string): string {
  return `${KV_PREFIX}:key:${cfgEpoch}:${kid}`;
}

export function grantKey(cfgEpoch: number, clientId: string, routeId: string): string {
  return `${KV_PREFIX}:grant:${cfgEpoch}:${clientId}:${routeId}`;
}

export function jtiRevocationKey(cfgEpoch: number, jti: string): string {
  return `${KV_PREFIX}:jti:${cfgEpoch}:${jti}`;
}

/** Admin JSON GET responses (same cfg epoch as proxy metadata). */
export function adminGetKey(cfgEpoch: number, pathAndQuery: string): string {
  return `${KV_PREFIX}:admin:${cfgEpoch}:${pathAndQuery}`;
}
