import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Table, Th, Td } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { Client, ClientRouteGrant, IssuedToken, Key, Route } from '@proxify-cf/shared';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EntityAuditHistoryModal, type EntityAuditScope } from '../components/EntityAuditHistoryModal';
import { AdminPageTitle } from '../components/AdminPageTitle';
import { useAdminApiRetryEpoch } from '../context/AdminApiRetryContext';
import { DataLoadError } from '../components/DataLoadError';
import { formatDateTime } from '../lib/formatDateTime';
import { loadErrorMessage } from '../lib/loadErrorMessage';

export const ClientDetail = () => {
  const navigate = useNavigate();
  const adminApiRetryEpoch = useAdminApiRetryEpoch();
  const { clientId } = useParams<{ clientId: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [keys, setKeys] = useState<Key[]>([]);
  const [tokens, setTokens] = useState<IssuedToken[]>([]);
  const [grants, setGrants] = useState<ClientRouteGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', description: '' });

  const [auditModalScope, setAuditModalScope] = useState<EntityAuditScope | null>(null);
  const [revokeKid, setRevokeKid] = useState<string | null>(null);
  const [revokeJti, setRevokeJti] = useState<string | null>(null);

  const client = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);

  const loadAll = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [clientsData, routesData, keysData, tokensData, grantsData] = await Promise.all([
        api.clients.list(),
        api.routes.list(),
        api.keys.list({ client_id: clientId }),
        api.keys.listTokens({ client_id: clientId }),
        api.grants.list({ client_id: clientId }),
      ]);
      setClients(clientsData);
      setRoutes(routesData);
      setKeys(keysData);
      setTokens(tokensData);
      setGrants(grantsData);
    } catch (e: unknown) {
      console.error(e);
      setLoadError(loadErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [clientId, adminApiRetryEpoch]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openEdit = () => {
    if (!client) return;
    setFormData({ name: client.name, email: client.email, description: client.description || '' });
    setEditError(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!clientId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await api.clients.update(clientId, formData);
      setEditOpen(false);
      await loadAll();
    } catch (e: any) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
    }
  };

  const confirmRevokeKey = async () => {
    if (!revokeKid) return;
    try {
      await api.keys.revoke(revokeKid);
      setRevokeKid(null);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const confirmRevokeToken = async () => {
    if (!revokeJti) return;
    try {
      await api.keys.revokeToken(revokeJti);
      setRevokeJti(null);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  if (!clientId) {
    return <p style={{ color: 'var(--text-secondary)' }}>Invalid client.</p>;
  }

  if (!loading && loadError) {
    return (
      <div>
        <Link to="/admin/clients" style={{ color: 'var(--accent-primary)', fontSize: 14 }}>
          ← Back to Clients
        </Link>
        <div style={{ marginTop: 24 }}>
          <DataLoadError message={loadError} onRetry={loadAll} />
        </div>
      </div>
    );
  }

  if (!loading && !loadError && !client) {
    return (
      <div>
        <Link to="/admin/clients" style={{ color: 'var(--accent-primary)', fontSize: 14 }}>
          ← Back to Clients
        </Link>
        <p style={{ marginTop: 24 }}>Client not found.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/admin/clients"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--accent-primary)',
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Clients
        </Link>
      </div>

      <AdminPageTitle
        title={loading ? '…' : client?.name ?? 'Client'}
        description={
          !loading && client ? (
            <>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>{client.email}</p>
              <p style={{ margin: '8px 0 0', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                {clientId}
              </p>
            </>
          ) : undefined
        }
        actions={
          <>
            <Button variant="secondary" type="button" onClick={openEdit} disabled={loading || !client}>
              Edit client
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => clientId && setAuditModalScope({ type: 'client', clientId })}
              disabled={loading}
            >
              Audit history
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(`/admin/keys?client_id=${encodeURIComponent(clientId)}`)}
            >
              Keys page (filtered)
            </Button>
          </>
        }
      />

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Signing keys</h3>
        <Table>
          <thead>
            <tr>
              <Th>Key ID</Th>
              <Th>Mode</Th>
              <Th>Algorithm</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={5} style={{ textAlign: 'center' }}>
                  Loading…
                </Td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <Td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No keys for this client.
                </Td>
              </tr>
            ) : (
              keys.map((k) => {
                const openKeyAudit = () => setAuditModalScope({ type: 'key', kid: k.kid });
                return (
                  <tr
                    key={k.kid}
                    tabIndex={0}
                    style={{ cursor: 'pointer', opacity: k.revoked_at ? 0.5 : 1 }}
                    aria-label={`Audit history for key ${k.kid.slice(0, 8)}…`}
                    onClick={openKeyAudit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openKeyAudit();
                      }
                    }}
                  >
                    <Td style={{ fontFamily: 'monospace', fontSize: 13 }}>{k.kid}</Td>
                    <Td>
                      <span
                        style={{
                          background: 'var(--accent-soft)',
                          color: 'var(--accent-primary)',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        {k.mode}
                      </span>
                    </Td>
                    <Td>{k.alg}</Td>
                    <Td>{k.revoked_at ? 'Revoked' : 'Active'}</Td>
                    <Td>
                      <div onClick={(e) => e.stopPropagation()}>
                        {!k.revoked_at && (
                          <Button variant="danger" size="sm" type="button" onClick={() => setRevokeKid(k.kid)}>
                            Revoke
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Issued JWTs</h3>
        <Table>
          <thead>
            <tr>
              <Th>JTI</Th>
              <Th>Key</Th>
              <Th>Label</Th>
              <Th>Expires</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={5} style={{ textAlign: 'center' }}>
                  Loading…
                </Td>
              </tr>
            ) : tokens.length === 0 ? (
              <tr>
                <Td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No issued tokens for this client.
                </Td>
              </tr>
            ) : (
              tokens.map((t) => {
                const openTokenAudit = () => setAuditModalScope({ type: 'key', kid: t.kid });
                return (
                  <tr
                    key={t.jti}
                    tabIndex={0}
                    style={{ cursor: 'pointer', opacity: t.revoked_at ? 0.5 : 1 }}
                    aria-label={`Audit history for signing key ${t.kid.slice(0, 8)}…`}
                    onClick={openTokenAudit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openTokenAudit();
                      }
                    }}
                  >
                    <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.jti.slice(0, 12)}…</Td>
                    <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.kid.slice(0, 8)}…</Td>
                    <Td>{t.label ?? '—'}</Td>
                    <Td>{formatDateTime(t.expires_at)}</Td>
                    <Td>
                      <div onClick={(e) => e.stopPropagation()}>
                        {!t.revoked_at && (
                          <Button variant="danger" size="sm" type="button" onClick={() => setRevokeJti(t.jti)}>
                            Revoke
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </section>

      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Route grants</h3>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => navigate(`/admin/grants?client_id=${encodeURIComponent(clientId)}`)}
          >
            Grants page (filtered)
          </Button>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Route</Th>
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
                  No grants for this client.
                </Td>
              </tr>
            ) : (
              grants.map((g) => {
                const rt = routeById.get(g.route_id);
                const label = rt ? `${rt.host}${rt.path_prefix !== '/' ? rt.path_prefix : ''}` : g.route_id;
                const openRoute = () => navigate(`/admin/routes/${g.route_id}`);
                return (
                  <tr
                    key={`${g.client_id}:${g.route_id}`}
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                    aria-label={`Open route ${label}`}
                    onClick={openRoute}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openRoute();
                      }
                    }}
                  >
                    <Td style={{ fontWeight: 500 }}>{label}</Td>
                    <Td>{formatDateTime(g.granted_at)}</Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </section>

      <EntityAuditHistoryModal
        isOpen={auditModalScope !== null}
        onClose={() => setAuditModalScope(null)}
        title={
          auditModalScope?.type === 'key'
            ? client
              ? `Audit · Key · ${client.name}`
              : 'Audit · Key'
            : client
              ? `Audit · ${client.name}`
              : 'Audit'
        }
        subtitle={auditModalScope?.type === 'key' ? auditModalScope.kid : clientId}
        scope={auditModalScope}
      />

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Client">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {editError && <div style={{ color: 'var(--accent-danger)', fontSize: 14 }}>{editError}</div>}
          <Input label="Client Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <Input
            label="Contact Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button variant="secondary" type="button" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit} isLoading={editSaving}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={revokeKid !== null}
        title="Revoke signing key?"
        message="Existing JWTs signed with this key may fail verification. This cannot be undone."
        confirmLabel="Revoke key"
        variant="danger"
        onCancel={() => setRevokeKid(null)}
        onConfirm={confirmRevokeKey}
      />

      <ConfirmDialog
        isOpen={revokeJti !== null}
        title="Revoke token?"
        message="This JWT will no longer be accepted."
        confirmLabel="Revoke token"
        variant="danger"
        onCancel={() => setRevokeJti(null)}
        onConfirm={confirmRevokeToken}
      />
    </div>
  );
};
