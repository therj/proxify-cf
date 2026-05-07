import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Table, Th, Td } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Client } from '@proxify-cf/shared';
import { AdminPageTitle } from '../components/AdminPageTitle';
import { useAdminApiRetryEpoch } from '../context/AdminApiRetryContext';
import { DataLoadError } from '../components/DataLoadError';
import { InlineSpinner } from '../components/ui/InlineSpinner';
import { TableBodyStableSlot } from '../components/ui/Skeleton';
import { formatDate } from '../lib/formatDateTime';
import { loadErrorMessage } from '../lib/loadErrorMessage';
import nc from '../components/ui/nativeControls.module.css';

export const Clients = () => {
  const navigate = useNavigate();
  const adminApiRetryEpoch = useAdminApiRetryEpoch();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listLoadError, setListLoadError] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', description: '', disabled: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadClients = async () => {
    setIsLoading(true);
    setListLoadError(null);
    try {
      const data = await api.clients.list();
      setClients(data);
    } catch (e: unknown) {
      console.error(e);
      setListLoadError(loadErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [adminApiRetryEpoch]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', description: '', disabled: false });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingId(c.id);
    setFormData({
      name: c.name,
      email: c.email,
      description: c.description || '',
      disabled: c.disabled_at != null,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const disabled_at = formData.disabled ? Date.now() : null;
      if (editingId) {
        await api.clients.update(editingId, {
          name: formData.name,
          email: formData.email,
          description: formData.description || null,
          disabled_at,
        });
      } else {
        await api.clients.create({
          name: formData.name,
          email: formData.email,
          description: formData.description || null,
          disabled_at,
        });
      }
      setModalOpen(false);
      await loadClients();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await api.clients.remove(deleteId);
      setDeleteId(null);
      await loadClients();
    } catch (e: unknown) {
      console.error(e);
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div>
      <AdminPageTitle
        title="Clients"
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus size={16} /> Add Client
          </Button>
        }
      />

      <Table>
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading || listLoadError ? (
            <TableBodyStableSlot colSpan={6}>
              {isLoading ? (
                <InlineSpinner />
              ) : (
                <DataLoadError layout="stretch" message={listLoadError!} onRetry={loadClients} />
              )}
            </TableBodyStableSlot>
          ) : clients.length === 0 ? (
            <tr>
              <Td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                No clients found.
              </Td>
            </tr>
          ) : (
            clients.map((client) => {
              const openDetail = () => navigate(`/admin/clients/${client.id}`);
              return (
                <tr
                  key={client.id}
                  tabIndex={0}
                  style={{ cursor: 'pointer', opacity: client.disabled_at != null ? 0.72 : 1 }}
                  aria-label={`Open client ${client.name}`}
                  onClick={openDetail}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDetail();
                    }
                  }}
                >
                  <Td style={{ fontFamily: 'monospace' }}>{client.id}</Td>
                  <Td style={{ fontWeight: 500 }}>{client.name}</Td>
                  <Td>{client.email}</Td>
                  <Td>{client.disabled_at != null ? 'Disabled' : 'Active'}</Td>
                  <Td>{formatDate(client.created_at)}</Td>
                  <Td>
                    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 8 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(client);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteError(null);
                          setDeleteName(client.name);
                          setDeleteId(client.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Client' : 'Create New Client'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ color: 'var(--accent-danger)', fontSize: 14 }}>{error}</div>}
          <Input
            label="Client Name"
            placeholder="e.g., Marketing Website"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Contact Email"
            type="email"
            placeholder="dev@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Optional"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              className={nc.select}
              style={{ width: 'auto', cursor: 'pointer' }}
              checked={formData.disabled}
              onChange={(e) => setFormData({ ...formData, disabled: e.target.checked })}
            />
            <span>Disabled (JWT access denied for this client)</span>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              {editingId ? 'Save Changes' : 'Create Client'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete client?"
        message={
          `Delete "${deleteName}" and all signing keys, issued JWTs, and route grants for this client? This cannot be undone.` +
          (deleteError ? `\n\n${deleteError}` : '')
        }
        confirmLabel="Delete client"
        variant="danger"
        isLoading={deleteSaving}
        onCancel={() => {
          if (!deleteSaving) {
            setDeleteId(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
