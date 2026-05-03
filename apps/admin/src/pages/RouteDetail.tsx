import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Table, Th, Td } from '../components/ui/Table';
import { EntityAuditHistoryModal } from '../components/EntityAuditHistoryModal';
import { api } from '../lib/api';
import { Client, ClientRouteGrant, Route } from '@proxify-cf/shared';
import { AdminPageTitle } from '../components/AdminPageTitle';
import { formatDateTime } from '../lib/formatDateTime';

export const RouteDetail = () => {
  const navigate = useNavigate();
  const { routeId } = useParams<{ routeId: string }>();
  const [auditOpen, setAuditOpen] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [grants, setGrants] = useState<ClientRouteGrant[]>([]);
  const [headers, setHeaders] = useState<{ id?: string; header_name: string; header_value: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const route = useMemo(() => routes.find((r) => r.id === routeId), [routes, routeId]);
  const nameByClient = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const loadAll = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);
    try {
      const [routesData, clientsData, grantsData, headersData] = await Promise.all([
        api.routes.list(),
        api.clients.list(),
        api.grants.list({ route_id: routeId }),
        api.routes.getHeaders(routeId),
      ]);
      setRoutes(routesData);
      setClients(clientsData);
      setGrants(grantsData);
      setHeaders(headersData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const routeLabel = (r: Route) => `${r.host}${r.path_prefix !== '/' ? r.path_prefix : ''}`;

  if (!routeId) {
    return <p style={{ color: 'var(--text-secondary)' }}>Invalid route.</p>;
  }

  if (!loading && !route) {
    return (
      <div>
        <Link to="/admin/routes" style={{ color: 'var(--accent-primary)', fontSize: 14 }}>
          ← Back to Routes
        </Link>
        <p style={{ marginTop: 24 }}>Route not found.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/admin/routes"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--accent-primary)',
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Routes
        </Link>
      </div>

      <AdminPageTitle
        title={loading ? '…' : route ? routeLabel(route) : 'Route'}
        description={
          !loading && route ? (
            <>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                Upstream: {route.upstream_url}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                {routeId}
              </p>
            </>
          ) : undefined
        }
        actions={
          <Button variant="secondary" type="button" onClick={() => setAuditOpen(true)} disabled={loading}>
            Audit history
          </Button>
        }
      />

      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Clients with access</h3>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => navigate(`/admin/grants?route_id=${encodeURIComponent(routeId)}`)}
          >
            Grants page (filtered)
          </Button>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Client</Th>
              <Th>Granted</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={2} style={{ textAlign: 'center' }}>
                  Loading…
                </Td>
              </tr>
            ) : grants.length === 0 ? (
              <tr>
                <Td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No grants for this route.
                </Td>
              </tr>
            ) : (
              grants.map((g) => (
                <tr key={`${g.client_id}:${g.route_id}`}>
                  <Td>
                    <Link
                      to={`/admin/clients/${g.client_id}`}
                      style={{ fontWeight: 500, color: 'var(--accent-primary)' }}
                    >
                      {nameByClient.get(g.client_id) ?? g.client_id}
                    </Link>
                  </Td>
                  <Td>{formatDateTime(g.granted_at)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Custom headers</h3>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
        ) : headers.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No custom headers on this route.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Value</Th>
              </tr>
            </thead>
            <tbody>
              {headers.map((h, i) => (
                <tr key={h.id ?? `${h.header_name}-${i}`}>
                  <Td style={{ fontWeight: 500 }}>{h.header_name}</Td>
                  <Td style={{ fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' }}>
                    {h.header_value}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          To add or change headers, use <Link to="/admin/routes">Routes</Link> and edit this route.
        </p>
      </section>

      <EntityAuditHistoryModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        title={route ? `Audit · ${routeLabel(route)}` : 'Audit'}
        subtitle={routeId}
        scope={routeId ? { type: 'route', routeId } : null}
      />
    </div>
  );
};
