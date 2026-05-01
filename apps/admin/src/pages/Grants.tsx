import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Table, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { ClientRouteGrant, Client, Route } from '@proxify-cf/shared';
import nc from '../components/ui/nativeControls.module.css';
import { ConfirmDialog } from '../components/ConfirmDialog';
export const Grants = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterClientId = searchParams.get('client_id') || undefined;
  const filterRouteId = searchParams.get('route_id') || undefined;

  const [grants, setGrants] = useState<ClientRouteGrant[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ client_id: '', route_id: '' });

  const [revokeTarget, setRevokeTarget] = useState<{ client_id: string; route_id: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const grantFilters: { client_id?: string; route_id?: string } = {};
      if (filterClientId) grantFilters.client_id = filterClientId;
      if (filterRouteId) grantFilters.route_id = filterRouteId;

      const [grantsData, clientsData, routesData] = await Promise.all([
        api.grants.list(Object.keys(grantFilters).length ? grantFilters : undefined),
        api.clients.list(),
        api.routes.list(),
      ]);
      setGrants(grantsData);
      setClients(clientsData);
      setRoutes(routesData);
      if (clientsData.length > 0 && !formData.client_id) {
        setFormData((prev) => ({ ...prev, client_id: clientsData[0].id }));
      }
      if (routesData.length > 0 && !formData.route_id) {
        setFormData((prev) => ({ ...prev, route_id: routesData[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterClientId, filterRouteId]);

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      await api.grants.create(formData);
      setModalOpen(false);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const clearFilters = () => {
    searchParams.delete('client_id');
    searchParams.delete('route_id');
    setSearchParams(searchParams);
  };

  const confirmRevokeGrant = async () => {
    if (!revokeTarget) return;
    try {
      await api.grants.revoke(revokeTarget.client_id, revokeTarget.route_id);
      setRevokeTarget(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const filterBannerActive = !!(filterClientId || filterRouteId);

  return (
    <div>
      {filterBannerActive ? (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid var(--surface-border)',
            background: 'var(--surface-bg)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 14 }}>
            {filterClientId ? (
              <>
                Client:{' '}
                <Link to={`/admin/clients/${filterClientId}`} style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                  {clients.find((c) => c.id === filterClientId)?.name ?? filterClientId.slice(0, 8) + '…'}
                </Link>
              </>
            ) : null}
            {filterClientId && filterRouteId ? ' · ' : null}
            {filterRouteId ? (
              <>
                Route:{' '}
                <Link to={`/admin/routes/${filterRouteId}`} style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                  {routes.find((r) => r.id === filterRouteId)?.host ?? filterRouteId.slice(0, 8) + '…'}
                </Link>
              </>
            ) : null}
          </span>
          <Button variant="secondary" size="sm" type="button" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Route Grants</h2>
        <Button
          type="button"
          onClick={() => {
            setFormData((prev) => ({
              ...prev,
              ...(filterClientId ? { client_id: filterClientId } : {}),
              ...(filterRouteId ? { route_id: filterRouteId } : {}),
            }));
            setModalOpen(true);
          }}
        >
          Create Grant
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Client</Th>
            <Th>Route Host</Th>
            <Th>Granted At</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><Td colSpan={4} style={{ textAlign: 'center' }}>Loading grants...</Td></tr>
          ) : grants.length === 0 ? (
             <tr><Td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No grants found.</Td></tr>
          ) : (
            grants.map((g) => {
              const clientName = clients.find((c) => c.id === g.client_id)?.name || g.client_id;
              const routeHost = routes.find((r) => r.id === g.route_id)?.host || g.route_id;
              const openRouteDetail = () => navigate(`/admin/routes/${g.route_id}`);
              return (
                <tr
                  key={`${g.client_id}:${g.route_id}`}
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  aria-label={`Open route ${routeHost} (grant for ${clientName})`}
                  onClick={openRouteDetail}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openRouteDetail();
                    }
                  }}
                >
                  <Td>{clientName}</Td>
                  <Td style={{ fontWeight: 500 }}>{routeHost}</Td>
                  <Td>{new Date(g.granted_at).toLocaleDateString()}</Td>
                  <Td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="danger"
                        size="sm"
                        type="button"
                        onClick={() => setRevokeTarget({ client_id: g.client_id, route_id: g.route_id })}
                      >
                        Revoke
                      </Button>
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Create Grant">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Client</label>
            <select
              className={nc.select}
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            >
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Route</label>
            <select
              className={nc.select}
              value={formData.route_id}
              onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
            >
              {routes.map(r => <option key={r.id} value={r.id}>{r.host}{r.path_prefix !== '/' ? r.path_prefix : ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={isSaving}>Grant Access</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={revokeTarget !== null}
        title="Revoke grant?"
        message="This client will immediately lose proxy access for that route until a new grant is created."
        confirmLabel="Revoke grant"
        variant="danger"
        onCancel={() => setRevokeTarget(null)}
        onConfirm={confirmRevokeGrant}
      />
    </div>
  );
};
