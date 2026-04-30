import { Route, Client, Key, IssuedToken, ClientRouteGrant, AuditLog } from '@proxify-cf/shared';

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
    removeHeader: (header_id: string) => fetchApi<{ success: true }>(`/routes/headers/${header_id}`, { method: 'DELETE' }),
  },
  clients: {
    list: () => fetchApi<Client[]>('/clients'),
    create: (data: Partial<Client>) => fetchApi<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) => fetchApi<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  keys: {
    list: () => fetchApi<Key[]>('/keys'),
    create: (data: { client_id: string; mode: 'client_signed' | 'server_issued' }) => 
      fetchApi<{ key: Key; privateJwk?: any }>('/keys', { method: 'POST', body: JSON.stringify(data) }),
    revoke: (kid: string) => fetchApi<{ success: true }>(`/keys/${kid}/revoke`, { method: 'POST' }),
    listTokens: () => fetchApi<IssuedToken[]>('/tokens'),
    mintToken: (kid: string, data: { client_id: string; label?: string; expires_in_days?: number }) => 
      fetchApi<{ token: string; issued: IssuedToken }>(`/keys/${kid}/tokens`, { method: 'POST', body: JSON.stringify(data) }),
    revokeToken: (jti: string) => fetchApi<{ success: true }>(`/tokens/${jti}/revoke`, { method: 'POST' })
  },
  grants: {
    list: () => fetchApi<ClientRouteGrant[]>('/grants'),
    create: (data: { client_id: string; route_id: string }) => fetchApi<ClientRouteGrant>('/grants', { method: 'POST', body: JSON.stringify(data) }),
    revoke: (client_id: string, route_id: string) => fetchApi<{ success: true }>(`/grants/${client_id}/${route_id}`, { method: 'DELETE' }),
  },
  audit: {
    list: () => fetchApi<AuditLog[]>('/audit')
  }
};
