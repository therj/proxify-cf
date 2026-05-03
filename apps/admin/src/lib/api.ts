import {
  Route,
  Client,
  Key,
  IssuedToken,
  ClientRouteGrant,
  AuditLog,
  AccessLog,
} from '@proxify-cf/shared';

const BASE_URL = '/admin/api/v1';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || `HTTP Error ${response.status}`);
  }

  if (json != null && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

export const api = {
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
    create: (data: Partial<Client>) => fetchApi<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) => fetchApi<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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
    count: () => fetchApi<number>('/audit/count'),
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
    count: () => fetchApi<number>('/access/count'),
  },
};
