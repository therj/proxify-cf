import {
  Route,
  Client,
  Key,
  IssuedToken,
  ClientRouteGrant,
  AuditLog,
  AccessLog,
} from '@proxify-cf/shared';
import { notifyFatalApiError } from './fatalApiError';

const BASE_URL = '/admin/api/v1';

const ERROR_DETAIL_MAX = 200;

function clipErrorDetail(s: string): string {
  const t = s.replace(/^Error:\s*/i, '').trim();
  return t.length <= ERROR_DETAIL_MAX ? t : `${t.slice(0, ERROR_DETAIL_MAX - 1)}…`;
}

function isAuthLikeFailure(response: Response): boolean {
  if (response.type === 'opaque') return true;
  if (response.status === 401 || response.status === 403) return true;
  if (response.redirected && response.url.includes('cloudflareaccess.com')) return true;
  return false;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch {
    notifyFatalApiError({ message: 'The request never reached the server.', variant: 'network' });
    throw new Error('Network error');
  }

  const authLike = isAuthLikeFailure(response);
  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      const variant: 'session' | 'server' | 'network' = authLike
        ? 'session'
        : response.status >= 500
          ? 'server'
          : 'network';
      notifyFatalApiError({
        message:
          variant === 'session'
            ? 'Expected JSON but got HTML (try signing in again).'
            : variant === 'server'
              ? `Server returned HTTP ${response.status} with a non-JSON body.`
              : 'The response was not valid JSON.',
        variant,
      });
      throw new SyntaxError('Invalid JSON');
    }
  }

  if (!response.ok) {
    const apiError =
      json != null && typeof json === 'object' && json !== null && 'error' in json
        ? String((json as { error: unknown }).error)
        : `HTTP ${response.status}`;
    const clipped = clipErrorDetail(apiError);
    // Only block the UI for auth-like failures. JSON 5xx (e.g. D1/SQLite) → inline page errors.
    if (authLike) {
      notifyFatalApiError({ message: clipped, variant: 'session' });
    }
    throw new Error(clipped);
  }

  if (json != null && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export type DashboardSummary = {
  counts: {
    clients: number;
    routes: number;
    keys: number;
    issued_tokens: number;
    audit_logs: number;
    access_logs: number;
  };
};

export const api = {
  dashboard: {
    summary: () => fetchApi<DashboardSummary>('/dashboard/summary'),
  },
  routes: {
    list: () => fetchApi<Route[]>('/routes'),
    create: (data: Partial<Route>) => fetchApi<Route>('/routes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Route>) => fetchApi<Route>(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => fetchApi<{ success: true }>(`/routes/${id}`, { method: 'DELETE' }),
    getHeaders: (id: string) => fetchApi<any[]>(`/routes/${id}/headers`),
    addHeader: (id: string, data: { header_name: string; header_value: string }) => 
      fetchApi<any>(`/routes/${id}/headers`, { method: 'POST', body: JSON.stringify(data) }),
    updateHeader: (header_id: string, data: { header_value: string }) =>
      fetchApi<{ success: true }>(
        `/routes/headers/${encodeURIComponent(header_id)}`,
        { method: 'PUT', body: JSON.stringify(data) }
      ),
    removeHeader: (header_id: string) =>
      fetchApi<{ success: true }>(`/routes/headers/${encodeURIComponent(header_id)}`, { method: 'DELETE' }),
  },
  clients: {
    list: () => fetchApi<Client[]>('/clients'),
    labels: () => fetchApi<Record<string, string>>('/clients/labels'),
    create: (data: Partial<Client>) => fetchApi<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) => fetchApi<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => fetchApi<{ success: true }>(`/clients/${id}`, { method: 'DELETE' }),
  },
  keys: {
    list: (filters?: { client_id?: string }) => {
      const q = new URLSearchParams();
      if (filters?.client_id) q.set('client_id', filters.client_id);
      const qs = q.toString();
      return fetchApi<Key[]>(`/keys${qs ? `?${qs}` : ''}`);
    },
    create: (data: { client_id: string; mode: 'client_signed' | 'server_issued' }) => 
      fetchApi<{ key: Key; privateJwk?: any }>('/keys', { method: 'POST', body: JSON.stringify(data) }),
    revoke: (kid: string) => fetchApi<{ success: true }>(`/keys/${kid}/revoke`, { method: 'POST' }),
    listTokens: (filters?: { client_id?: string; kid?: string }) => {
      const q = new URLSearchParams();
      if (filters?.client_id) q.set('client_id', filters.client_id);
      if (filters?.kid) q.set('kid', filters.kid);
      const qs = q.toString();
      return fetchApi<IssuedToken[]>(`/tokens${qs ? `?${qs}` : ''}`);
    },
    mintToken: (kid: string, data: { client_id: string; label?: string; expires_in_days?: number }) => 
      fetchApi<{ token: string; issued: IssuedToken }>(`/keys/${kid}/tokens`, { method: 'POST', body: JSON.stringify(data) }),
    revokeToken: (jti: string) => fetchApi<{ success: true }>(`/tokens/${jti}/revoke`, { method: 'POST' })
  },
  grants: {
    list: (filters?: { client_id?: string; route_id?: string }) => {
      const q = new URLSearchParams();
      if (filters?.client_id) q.set('client_id', filters.client_id);
      if (filters?.route_id) q.set('route_id', filters.route_id);
      const qs = q.toString();
      return fetchApi<ClientRouteGrant[]>(`/grants${qs ? `?${qs}` : ''}`);
    },
    create: (data: { client_id: string; route_id: string }) => fetchApi<ClientRouteGrant>('/grants', { method: 'POST', body: JSON.stringify(data) }),
    revoke: (client_id: string, route_id: string) => fetchApi<{ success: true }>(`/grants/${client_id}/${route_id}`, { method: 'DELETE' }),
  },
  audit: {
    list: (filters?: {
      client_id?: string;
      action?: string;
      target?: string;
      kid?: string;
      route_id?: string;
      since?: number;
      until?: number;
      limit?: number;
      offset?: number;
    }) => {
      const q = new URLSearchParams();
      if (filters?.client_id) q.set('client_id', filters.client_id);
      if (filters?.action) q.set('action', filters.action);
      if (filters?.target) q.set('target', filters.target);
      if (filters?.kid) q.set('kid', filters.kid);
      if (filters?.route_id) q.set('route_id', filters.route_id);
      if (filters?.since != null) q.set('since', String(filters.since));
      if (filters?.until != null) q.set('until', String(filters.until));
      if (filters?.limit != null) q.set('limit', String(filters.limit));
      if (filters?.offset != null) q.set('offset', String(filters.offset));
      const qs = q.toString();
      return fetchApi<AuditLog[]>(`/audit${qs ? `?${qs}` : ''}`);
    },
    actions: () => fetchApi<string[]>('/audit/actions'),
  },
  access: {
    list: (filters?: {
      client_id?: string;
      route_id?: string;
      kid?: string;
      outcome?: string;
      host_path?: string;
      since?: number;
      until?: number;
      limit?: number;
      offset?: number;
    }) => {
      const q = new URLSearchParams();
      if (filters?.client_id) q.set('client_id', filters.client_id);
      if (filters?.route_id) q.set('route_id', filters.route_id);
      if (filters?.kid) q.set('kid', filters.kid);
      if (filters?.outcome) q.set('outcome', filters.outcome);
      if (filters?.host_path?.trim()) q.set('host_path', filters.host_path.trim());
      if (filters?.since != null) q.set('since', String(filters.since));
      if (filters?.until != null) q.set('until', String(filters.until));
      if (filters?.limit != null) q.set('limit', String(filters.limit));
      if (filters?.offset != null) q.set('offset', String(filters.offset));
      const qs = q.toString();
      return fetchApi<AccessLog[]>(`/access${qs ? `?${qs}` : ''}`);
    },
  },
};
