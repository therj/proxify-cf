import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Table, Th, Td } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Client } from '@proxify-cf/shared';

export const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', description: '' });

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await api.clients.list();
      setClients(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', description: '' });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingId(c.id);
    setFormData({ name: c.name, email: c.email, description: c.description || '' });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      if (editingId) {
        await api.clients.update(editingId, formData);
      } else {
        await api.clients.create(formData);
      }
      setModalOpen(false);
      await loadClients();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Clients</h2>
        <Button onClick={handleOpenCreate}>
          <Plus size={16} /> Add Client
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Created</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><Td colSpan={5} style={{ textAlign: 'center' }}>Loading clients...</Td></tr>
          ) : clients.length === 0 ? (
            <tr><Td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No clients found.</Td></tr>
          ) : (
            clients.map((client) => (
              <tr key={client.id}>
                <Td style={{ fontFamily: 'monospace' }}>{client.id}</Td>
                <Td>{client.name}</Td>
                <Td>{client.email}</Td>
                <Td>{new Date(client.created_at).toLocaleDateString()}</Td>
                <Td>
                  <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(client)}>Edit</Button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Client" : "Create New Client"}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ color: 'var(--accent-danger)', fontSize: 14 }}>{error}</div>}
          <Input 
            label="Client Name" 
            placeholder="e.g., Marketing Website" 
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
          <Input 
            label="Contact Email" 
            type="email" 
            placeholder="dev@example.com" 
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
          />
          <Input 
            label="Description" 
            placeholder="Optional" 
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} isLoading={isSaving}>{editingId ? 'Save Changes' : 'Create Client'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
