import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Table, Th, Td } from '../components/ui/Table';
import { EntityAuditHistoryModal } from '../components/EntityAuditHistoryModal';
import { api } from '../lib/api';
import { Client, ClientRouteGrant, Route } from '@proxify-cf/shared';
import { AdminPageTitle } from '../components/AdminPageTitle';
import { useAdminApiRetryEpoch } from '../context/AdminApiRetryContext';
import { DataLoadError } from '../components/DataLoadError';
import { Skeleton, TableBodyStableSlot, TableSkeletonGrid } from '../components/ui/Skeleton';
import { formatDateTime } from '../lib/formatDateTime';
import { loadErrorMessage } from '../lib/loadErrorMessage';

export const RouteDetail = () => {
  const navigate = useNavigate();
  const adminApiRetryEpoch = useAdminApiRetryEpoch();
  const { routeId } = useParams<{ routeId: string }>();
  const [auditOpen, setAuditOpen] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [grants, setGrants] = useState<ClientRouteGrant[]>([]);
  const [headers, setHeaders] = useState<{ id?: string; header_name: string; header_value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const route = useMemo(() => routes.find((r) => r.id === routeId), [routes, routeId]);
  const nameByClient = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const loadAll = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);
    setLoadError(null);
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
    } catch (e: unknown) {
      console.error(e);
      setLoadError(loadErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [routeId, adminApiRetryEpoch]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const routeLabel = (r: Route) => `${r.host}${r.path_prefix !== '/' ? r.path_prefix : ''}`;

  if (!routeId) {
    return <p style={{ color: 'var(--text-secondary)' }}>Invalid route.</p>;
  }

  if (!loading && loadError) {
    return (
      <div>
        <Link to="/admin/routes" style={{ color: 'var(--accent-primary)', fontSize: 14 }}>
          ← Back to Routes
        </Link>
        <div style={{ marginTop: 24 }}>
          <DataLoadError message={loadError} onRetry={loadAll} />
        </div>
      </div>
    );
  }

  if (!loading && !loadError && !route) {
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
        title={
          loading ? (
            <Skeleton height={28} width={280} radius="md" ariaLabel="Loading route" />
          ) : route ? (
            routeLabel(route)
          ) : (
            'Route'
          )
        }
        description={
          loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton height={14} width="85%" radius="pill" />
              <Skeleton height={12} width="50%" radius="pill" />
            </div>
          ) : route ? (
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
              <TableBodyStableSlot colSpan={2} minHeight="clamp(200px, 28vh, 360px)">
                <TableSkeletonGrid columns={2} rows={6} columnFr={[2, 1]} />
              </TableBodyStableSlot>
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
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Value</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableBodyStableSlot colSpan={2} minHeight="clamp(200px, 28vh, 360px)">
                <TableSkeletonGrid columns={2} rows={5} columnFr={[1, 2]} />
              </TableBodyStableSlot>
            ) : headers.length === 0 ? (
              <tr>
                <Td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  No custom headers on this route.
                </Td>
              </tr>
            ) : (
              headers.map((h, i) => (
                <tr key={h.id ?? `${h.header_name}-${i}`}>
                  <Td style={{ fontWeight: 500 }}>{h.header_name}</Td>
                  <Td style={{ fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' }}>
                    {h.header_value}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
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
