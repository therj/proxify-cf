import type { AuditLog } from '@proxify-cf/shared';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** e.g. 11.26am, 30 April */
export function formatAuditTimestamp(ts: number): string {
  const d = new Date(ts);
  const h24 = d.getHours();
  const minutes = d.getMinutes();
  const ampm = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 || 12;
  const mm = minutes.toString().padStart(2, '0');
  const day = d.getDate();
  const monthName = MONTH_NAMES[d.getMonth()];
  return `${h12}.${mm}${ampm}, ${day} ${monthName}`;
}

export function parseAuditMeta(meta: string | null | undefined): Record<string, unknown> {
  if (meta == null || meta === '') return {};
  try {
    return JSON.parse(meta) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Prefer column `client_id`, then meta.client_id. */
export function effectiveClientId(log: AuditLog): string | undefined {
  if (log.client_id) return log.client_id;
  const m = parseAuditMeta(log.meta);
  return typeof m.client_id === 'string' ? m.client_id : undefined;
}

export function formatAuditSummary(log: AuditLog, nameById: Map<string, string>): string {
  const meta = parseAuditMeta(log.meta);
  const cid = effectiveClientId(log);
  const clientName = cid ? nameById.get(cid) : undefined;

  const routeLabel = (host: unknown, pathPrefix: unknown) =>
    `${String(host)}${pathPrefix !== '/' && pathPrefix != null ? String(pathPrefix) : ''}`;

  switch (log.action) {
    case 'MINT_TOKEN':
      if (typeof meta.label === 'string')
        return clientName ? `Token "${meta.label}" · ${clientName}` : `Token "${meta.label}"`;
      break;
    case 'CREATE_CLIENT':
      if (typeof meta.name === 'string') return `Client "${meta.name}"`;
      break;
    case 'UPDATE_CLIENT': {
      const before = meta.before as Record<string, unknown> | undefined;
      const after = meta.after as Record<string, unknown> | undefined;
      const bn = before?.name;
      const an = after?.name;
      if (typeof bn === 'string' && typeof an === 'string' && bn !== an)
        return `Renamed "${bn}" → "${an}"`;
      return clientName ? `Client updated (${clientName})` : 'Client updated';
    }
    case 'UPDATE_ROUTE': {
      const before = meta.before as Record<string, unknown> | undefined;
      const after = meta.after as Record<string, unknown> | undefined;
      const bh = before?.host;
      const ah = after?.host;
      const bp = before?.path_prefix ?? '/';
      const ap = after?.path_prefix ?? '/';
      if (bh !== ah || bp !== ap)
        return `Route ${routeLabel(bh, bp)} → ${routeLabel(ah, ap)}`;
      return typeof ah === 'string' ? `Route ${routeLabel(ah, ap)}` : log.target;
    }
    case 'CREATE_ROUTE':
    case 'DELETE_ROUTE':
      if (typeof meta.host === 'string')
        return `Route ${routeLabel(meta.host, meta.path_prefix ?? '/')}`;
      return log.target;
    case 'ADD_ROUTE_HEADER':
      if (typeof meta.header_name === 'string' && typeof meta.host === 'string')
        return `Header "${meta.header_name}" on ${routeLabel(meta.host, meta.path_prefix ?? '/')}`;
      if (typeof meta.header_name === 'string') return `Header "${meta.header_name}"`;
      break;
    case 'REMOVE_ROUTE_HEADER':
      if (typeof meta.host === 'string' && typeof meta.header_name === 'string')
        return `Removed "${meta.header_name}" from ${routeLabel(meta.host, meta.path_prefix ?? '/')}`;
      break;
    case 'CREATE_KEY':
      if (clientName) return `Signing key · ${clientName}`;
      if (typeof meta.client_id === 'string') return `Signing key (${String(meta.client_id).slice(0, 8)}…)`;
      break;
    case 'REVOKE_KEY':
      if (clientName) return `Revoked key · ${clientName}`;
      break;
    case 'REVOKE_TOKEN':
      if (typeof meta.label === 'string' && clientName)
        return `Revoked token "${meta.label}" · ${clientName}`;
      if (clientName) return `Revoked token · ${clientName}`;
      break;
    case 'CREATE_GRANT':
      return log.target || 'Access grant';
    case 'REVOKE_GRANT':
      return log.target || 'Grant revoked';
    default:
      break;
  }

  if (log.action.includes('CLIENT') && typeof meta.name === 'string')
    return `Client "${meta.name}"`;
  if (log.action.includes('ROUTE') && typeof meta.host === 'string')
    return `Route ${routeLabel(meta.host, meta.path_prefix ?? '/')}`;
  if (log.action.includes('KEY') && clientName) return `Key · ${clientName}`;
  if (log.action.includes('HEADER') && typeof meta.header_name === 'string')
    return `Header "${meta.header_name}"`;
  if (log.action === 'CREATE_GRANT') return 'Access Grant';

  return log.target.length > 48 ? `${log.target.slice(0, 45)}…` : log.target;
}
