import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Table, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Key, Client } from '@proxify-cf/shared';
import nc from '../components/ui/nativeControls.module.css';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AdminPageTitle } from '../components/AdminPageTitle';
import { useAdminApiRetryEpoch } from '../context/AdminApiRetryContext';
import { DataLoadError } from '../components/DataLoadError';
import { TableBodyStableSlot, TableSkeletonGrid } from '../components/ui/Skeleton';
import { loadErrorMessage } from '../lib/loadErrorMessage';
export const Keys = () => {
  const navigate = useNavigate();
  const adminApiRetryEpoch = useAdminApiRetryEpoch();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterClientId = searchParams.get('client_id') || undefined;

  const [keys, setKeys] = useState<Key[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isGenerateOpen, setGenerateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<any>(null); // To show private key once
  const [error, setError] = useState<string | null>(null);
  const [listLoadError, setListLoadError] = useState<string | null>(null);

  const [isMintOpen, setMintOpen] = useState(false);
  const [selectedKid, setSelectedKid] = useState<string | null>(null);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [validityValue, setValidityValue] = useState(30);
  const [validityUnit, setValidityUnit] = useState<'Days' | 'Months' | 'Years'>('Days');

  const [revokeKid, setRevokeKid] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState({ client_id: '', mode: 'client_signed' as 'client_signed' | 'server_issued' });

  const loadData = async () => {
    setIsLoading(true);
    setListLoadError(null);
    try {
      const [keysData, clientsData] = await Promise.all([
        api.keys.list(filterClientId ? { client_id: filterClientId } : undefined),
        api.clients.list(),
      ]);
      setKeys(keysData);
      setClients(clientsData);
      if (clientsData.length > 0 && !formData.client_id) {
        setFormData((prev) => ({ ...prev, client_id: clientsData[0].id }));
      }
    } catch (e: unknown) {
      console.error(e);
      setListLoadError(loadErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterClientId, adminApiRetryEpoch]);

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const result = await api.keys.create(formData);
      if (result.privateJwk) {
        setGeneratedKey(result.privateJwk);
      } else {
        setGenerateOpen(false);
      }
      await loadData();
    } catch (e: any) {
      setError(e.message);
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmRevokeKey = async () => {
    if (!revokeKid) return;
    try {
      await api.keys.revoke(revokeKid);
      setRevokeKid(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMint = async () => {
    if (!selectedKid) return;
    const key = keys.find(k => k.kid === selectedKid);
    if (!key) return;

    setError(null);
    try {
      let expires_in_days = validityValue;
      if (validityUnit === 'Months') expires_in_days *= 30;
      if (validityUnit === 'Years') expires_in_days *= 365;

      const result = await api.keys.mintToken(selectedKid, { 
        client_id: key.client_id, 
        label: 'Admin Minted',
        expires_in_days
      });
      setMintedToken(result.token);
    } catch (e: any) {
      setError(e.message);
      console.error(e);
    }
  };

  const openMintModal = (kid: string) => {
    setSelectedKid(kid);
    setMintedToken(null);
    setError(null);
    setValidityValue(30);
    setValidityUnit('Days');
    setMintOpen(true);
  };

  const clearFilter = () => {
    searchParams.delete('client_id');
    setSearchParams(searchParams);
  };

  const filterClientName = filterClientId ? clients.find((c) => c.id === filterClientId)?.name : null;

  return (
    <div>
      {filterClientId ? (
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
            Showing keys for client{' '}
            <Link to={`/admin/clients/${filterClientId}`} style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
              {filterClientName ?? filterClientId.slice(0, 8) + '…'}
            </Link>
          </span>
          <Button variant="secondary" size="sm" type="button" onClick={clearFilter}>
            Clear filter
          </Button>
        </div>
      ) : null}
      <AdminPageTitle
        title="Keys & Tokens"
        actions={
          <Button
            onClick={() => {
              if (filterClientId) setFormData((prev) => ({ ...prev, client_id: filterClientId }));
              setGenerateOpen(true);
            }}
          >
            <Plus size={16} /> Generate Key
          </Button>
        }
      />

      <Table>
        <thead>
          <tr>
            <Th>Key ID</Th>
            <Th>Client</Th>
            <Th>Mode</Th>
            <Th>Algorithm</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading || listLoadError ? (
            <TableBodyStableSlot colSpan={6}>
              {isLoading ? (
                <TableSkeletonGrid columns={6} rows={8} columnFr={[2, 2, 1, 1, 1, 1]} />
              ) : (
                <DataLoadError layout="stretch" message={listLoadError!} onRetry={loadData} />
              )}
            </TableBodyStableSlot>
          ) : keys.length === 0 ? (
            <tr><Td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No keys found.</Td></tr>
          ) : (
            keys.map((k) => {
              const openClient = () => navigate(`/admin/clients/${k.client_id}`);
              return (
                <tr
                  key={k.kid}
                  tabIndex={0}
                  style={{ cursor: 'pointer', opacity: k.revoked_at ? 0.5 : 1 }}
                  aria-label={`Open client for key ${k.kid.slice(0, 8)}…`}
                  onClick={openClient}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openClient();
                    }
                  }}
                >
                  <Td style={{ fontFamily: 'monospace' }}>{k.kid}</Td>
                  <Td>{clients.find((c) => c.id === k.client_id)?.name || k.client_id}</Td>
                  <Td>
                    <span style={{
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-primary)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                    }}>
                      {k.mode}
                    </span>
                  </Td>
                  <Td>{k.alg}</Td>
                  <Td>{k.revoked_at ? 'Revoked' : 'Active'}</Td>
                  <Td>
                    {!k.revoked_at ? (
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Ghost Mint JWT reserves width so Revoke aligns with server_issued rows; gap 8 matches Routes */}
                        <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={k.mode === 'server_issued' ? () => openMintModal(k.kid) : undefined}
                            disabled={k.mode !== 'server_issued'}
                            tabIndex={k.mode === 'server_issued' ? undefined : -1}
                            aria-hidden={k.mode !== 'server_issued' || undefined}
                            style={
                              k.mode !== 'server_issued'
                                ? { visibility: 'hidden', pointerEvents: 'none' }
                                : undefined
                            }
                          >
                            Mint JWT
                          </Button>
                        </span>
                        <Button variant="danger" size="sm" type="button" onClick={() => setRevokeKid(k.kid)}>
                          Revoke
                        </Button>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      <Modal isOpen={isGenerateOpen} onClose={() => { setGenerateOpen(false); setGeneratedKey(null); }} title="Generate Key">
        {generatedKey ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--accent-danger)' }}>Warning: This is the ONLY time the private key will be shown. Please copy it now.</p>
            <textarea
              readOnly
              className={nc.textareaCode}
              style={{ height: 200 }}
              value={JSON.stringify(generatedKey, null, 2)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button onClick={() => { setGenerateOpen(false); setGeneratedKey(null); }}>Done</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ color: 'var(--accent-danger)', fontSize: 14 }}>{error}</div>}
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
              <label style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Mode</label>
              <select
                className={nc.select}
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'client_signed' | 'server_issued' })}
              >
                <option value="client_signed">Client Signed (Download Private JWK)</option>
                <option value="server_issued">Server Issued (Mint JWTs Here)</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <Button variant="secondary" onClick={() => setGenerateOpen(false)} disabled={isGenerating}>Cancel</Button>
              <Button onClick={handleGenerate} isLoading={isGenerating}>Generate</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isMintOpen} onClose={() => setMintOpen(false)} title="Mint JWT">
        {mintedToken ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p>Your token has been minted:</p>
            <textarea readOnly className={nc.textareaCode} style={{ height: 100 }} value={mintedToken} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button onClick={() => setMintOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ color: 'var(--accent-danger)', fontSize: 14 }}>{error}</div>}
            <p>Mint a new JWT using the server's private key.</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input 
                  label="Validity Duration" 
                  type="number" 
                  value={validityValue}
                  onChange={e => setValidityValue(parseInt(e.target.value) || 1)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <label style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Unit</label>
                <select
                  className={nc.select}
                  style={{ minHeight: 42 }}
                  value={validityUnit}
                  onChange={(e) => setValidityUnit(e.target.value as 'Days' | 'Months' | 'Years')}
                >
                  <option value="Days">Days</option>
                  <option value="Months">Months</option>
                  <option value="Years">Years</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <Button variant="secondary" onClick={() => setMintOpen(false)}>Cancel</Button>
              <Button onClick={handleMint}>Mint Token</Button>
            </div>
          </div>
        )}
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
    </div>
  );
};
