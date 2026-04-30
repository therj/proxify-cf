import React, { useState, useEffect } from 'react';
import { Table, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Key, Client } from '@proxify-cf/shared';

export const Keys = () => {
  const [keys, setKeys] = useState<Key[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isGenerateOpen, setGenerateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<any>(null); // To show private key once
  const [error, setError] = useState<string | null>(null);
  
  const [isMintOpen, setMintOpen] = useState(false);
  const [selectedKid, setSelectedKid] = useState<string | null>(null);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [validityValue, setValidityValue] = useState(30);
  const [validityUnit, setValidityUnit] = useState<'Days' | 'Months' | 'Years'>('Days');

  // Form Data
  const [formData, setFormData] = useState({ client_id: '', mode: 'client_signed' as 'client_signed' | 'server_issued' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [keysData, clientsData] = await Promise.all([
        api.keys.list(),
        api.clients.list()
      ]);
      setKeys(keysData);
      setClients(clientsData);
      if (clientsData.length > 0 && !formData.client_id) {
        setFormData(prev => ({ ...prev, client_id: clientsData[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleRevoke = async (kid: string) => {
    if (!confirm('Are you sure you want to revoke this key?')) return;
    try {
      await api.keys.revoke(kid);
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Keys & Tokens</h2>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus size={16} /> Generate Key
        </Button>
      </div>

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
          {isLoading ? (
            <tr><Td colSpan={6} style={{ textAlign: 'center' }}>Loading keys...</Td></tr>
          ) : keys.length === 0 ? (
            <tr><Td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No keys found.</Td></tr>
          ) : (
            keys.map((k) => (
              <tr key={k.kid} style={{ opacity: k.revoked_at ? 0.5 : 1 }}>
                <Td style={{ fontFamily: 'monospace' }}>{k.kid}</Td>
                <Td>{clients.find(c => c.id === k.client_id)?.name || k.client_id}</Td>
                <Td>
                  <span style={{ 
                    background: 'rgba(99, 102, 241, 0.2)', 
                    color: 'var(--accent-primary)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 12
                  }}>
                    {k.mode}
                  </span>
                </Td>
                <Td>{k.alg}</Td>
                <Td>{k.revoked_at ? 'Revoked' : 'Active'}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {k.mode === 'server_issued' && !k.revoked_at && (
                      <Button variant="secondary" size="sm" onClick={() => openMintModal(k.kid)}>Mint JWT</Button>
                    )}
                    {!k.revoked_at && (
                      <Button variant="danger" size="sm" onClick={() => handleRevoke(k.kid)}>Revoke</Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal isOpen={isGenerateOpen} onClose={() => { setGenerateOpen(false); setGeneratedKey(null); }} title="Generate Key">
        {generatedKey ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--accent-danger)' }}>Warning: This is the ONLY time the private key will be shown. Please copy it now.</p>
            <textarea 
              readOnly 
              value={JSON.stringify(generatedKey, null, 2)} 
              style={{ width: '100%', height: 200, fontFamily: 'monospace', padding: 12, background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
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
                style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                value={formData.client_id}
                onChange={e => setFormData({ ...formData, client_id: e.target.value })}
              >
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Mode</label>
              <select 
                style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                value={formData.mode}
                onChange={e => setFormData({ ...formData, mode: e.target.value as any })}
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
            <textarea 
              readOnly 
              value={mintedToken} 
              style={{ width: '100%', height: 100, fontFamily: 'monospace', padding: 12, background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            />
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
                  style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', height: '42px' }}
                  value={validityUnit}
                  onChange={e => setValidityUnit(e.target.value as any)}
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
    </div>
  );
};
