import React, { useState, useEffect } from 'react';
import { Table, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { ClientRouteGrant, Client, Route } from '@proxify-cf/shared';

export const Grants = () => {
  const [grants, setGrants] = useState<ClientRouteGrant[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ client_id: '', route_id: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [grantsData, clientsData, routesData] = await Promise.all([
        api.grants.list(),
        api.clients.list(),
        api.routes.list()
      ]);
      setGrants(grantsData);
      setClients(clientsData);
      setRoutes(routesData);
      if (clientsData.length > 0 && !formData.client_id) {
        setFormData(prev => ({ ...prev, client_id: clientsData[0].id }));
      }
      if (routesData.length > 0 && !formData.route_id) {
        setFormData(prev => ({ ...prev, route_id: routesData[0].id }));
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

  const handleRevoke = async (client_id: string, route_id: string) => {
    if (!confirm('Revoke this grant?')) return;
    try {
      await api.grants.revoke(client_id, route_id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Route Grants</h2>
        <Button onClick={() => setModalOpen(true)}>Create Grant</Button>
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
            grants.map((g, i) => (
              <tr key={i}>
                <Td>{clients.find(c => c.id === g.client_id)?.name || g.client_id}</Td>
                <Td style={{ fontWeight: 500 }}>{routes.find(r => r.id === g.route_id)?.host || g.route_id}</Td>
                <Td>{new Date(g.granted_at).toLocaleDateString()}</Td>
                <Td>
                  <Button variant="danger" size="sm" onClick={() => handleRevoke(g.client_id, g.route_id)}>Revoke</Button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Create Grant">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <label style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Route</label>
            <select 
              style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
              value={formData.route_id}
              onChange={e => setFormData({ ...formData, route_id: e.target.value })}
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
    </div>
  );
};
