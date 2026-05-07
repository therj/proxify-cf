import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Table, Th, Td } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Route } from '@proxify-cf/shared';
import nc from '../components/ui/nativeControls.module.css';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AdminPageTitle } from '../components/AdminPageTitle';
import { useAdminApiRetryEpoch } from '../context/AdminApiRetryContext';
import { DataLoadError } from '../components/DataLoadError';
import { InlineSpinner } from '../components/ui/InlineSpinner';
import { TableBodyStableSlot } from '../components/ui/Skeleton';
import { loadErrorMessage } from '../lib/loadErrorMessage';

export const Routes = () => {
  const navigate = useNavigate();
  const adminApiRetryEpoch = useAdminApiRetryEpoch();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ host: '', path_prefix: '/', upstream_url: '' });
  
  // Headers Form State
  const [formHeaders, setFormHeaders] = useState<{ id?: string; header_name: string; header_value: string }[]>([]);
  const [newHeaderName, setNewHeaderName] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');
  /** Index in formHeaders being edited in the draft row; null = adding new. */
  const [editingHeaderIndex, setEditingHeaderIndex] = useState<number | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<'details' | 'headers'>('details');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [listLoadError, setListLoadError] = useState<string | null>(null);

  const loadRoutes = async () => {
    setIsLoading(true);
    setListLoadError(null);
    try {
      const data = await api.routes.list();
      setRoutes(data);
    } catch (e: unknown) {
      console.error(e);
      setListLoadError(loadErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, [adminApiRetryEpoch]);

  const resetHeaderDraft = () => {
    setEditingHeaderIndex(null);
    setNewHeaderName('');
    setNewHeaderValue('');
  };

  const closeRouteModal = () => {
    setModalOpen(false);
    resetHeaderDraft();
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ host: '', path_prefix: '/', upstream_url: '' });
    setFormHeaders([]);
    resetHeaderDraft();
    setError(null);
    setActiveTab('details');
    setModalOpen(true);
  };

  const handleOpenEdit = async (r: Route) => {
    setEditingId(r.id);
    setFormData({ host: r.host, path_prefix: r.path_prefix, upstream_url: r.upstream_url });
    setFormHeaders([]); // Clear previous
    resetHeaderDraft();
    setError(null);
    setActiveTab('details');
    setModalOpen(true);
    
    try {
      const hdrs = await api.routes.getHeaders(r.id);
      setFormHeaders(hdrs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      let routeId = editingId;
      if (editingId) {
        await api.routes.update(editingId, formData);
      } else {
        const created = await api.routes.create(formData);
        routeId = created.id;
      }

      // Sync Headers
      if (routeId) {
        const existingHdrs = editingId ? await api.routes.getHeaders(routeId) : [];
        const existingIds = new Set(existingHdrs.map(h => h.id));
        const currentIds = new Set(formHeaders.filter(h => h.id).map(h => h.id));
        
        // Delete removed headers
        for (const h of existingHdrs) {
          if (!currentIds.has(h.id)) {
            await api.routes.removeHeader(h.id);
          }
        }
        
        for (const h of formHeaders) {
          if (h.id) {
            const ex = existingHdrs.find((e: { id: string }) => e.id === h.id);
            if (ex && ex.header_value !== h.header_value) {
              await api.routes.updateHeader(h.id, { header_value: h.header_value });
            }
          } else {
            await api.routes.addHeader(routeId, { header_name: h.header_name, header_value: h.header_value });
          }
        }
      }

      closeRouteModal();
      await loadRoutes();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.routes.remove(deleteConfirmId);
      setDeleteConfirmId(null);
      await loadRoutes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveHeaderDraft = () => {
    if (!newHeaderName || !newHeaderValue) return;
    if (editingHeaderIndex !== null) {
      setFormHeaders((prev) => {
        const next = [...prev];
        const cur = next[editingHeaderIndex];
        if (!cur) return prev;
        next[editingHeaderIndex] = { ...cur, header_value: newHeaderValue };
        return next;
      });
      resetHeaderDraft();
      return;
    }
    setFormHeaders([...formHeaders, { header_name: newHeaderName, header_value: newHeaderValue }]);
    setNewHeaderName('');
    setNewHeaderValue('');
  };

  const handleStartEditHeader = (idx: number) => {
    const h = formHeaders[idx];
    setEditingHeaderIndex(idx);
    setNewHeaderName(h.header_name);
    setNewHeaderValue(h.header_value);
  };

  const handleRemoveLocalHeader = (idx: number) => {
    if (editingHeaderIndex === idx) {
      resetHeaderDraft();
    } else if (editingHeaderIndex !== null && editingHeaderIndex > idx) {
      setEditingHeaderIndex(editingHeaderIndex - 1);
    }
    setFormHeaders(formHeaders.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <AdminPageTitle
        title="Routes"
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus size={16} /> Add Route
          </Button>
        }
      />

      <Table>
        <thead>
          <tr>
            <Th>Host</Th>
            <Th>Path Prefix</Th>
            <Th>Upstream URL</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading || listLoadError ? (
            <TableBodyStableSlot colSpan={4}>
              {isLoading ? (
                <InlineSpinner />
              ) : (
                <DataLoadError layout="stretch" message={listLoadError!} onRetry={loadRoutes} />
              )}
            </TableBodyStableSlot>
          ) : routes.length === 0 ? (
            <tr><Td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No routes found.</Td></tr>
          ) : (
            routes.map((route) => {
              const openDetail = () => navigate(`/admin/routes/${route.id}`);
              return (
                <tr
                  key={route.id}
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  aria-label={`Open route ${route.host}`}
                  onClick={openDetail}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDetail();
                    }
                  }}
                >
                  <Td style={{ fontWeight: 500 }}>{route.host}</Td>
                  <Td style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{route.path_prefix}</Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{route.upstream_url}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      <Button variant="secondary" size="sm" type="button" onClick={() => handleOpenEdit(route)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" type="button" onClick={() => setDeleteConfirmId(route.id)}>
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeRouteModal} 
        title={editingId ? "Edit Route" : "Create New Route"}
        width={700}
        error={error}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button variant="secondary" onClick={closeRouteModal} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} isLoading={isSaving}>{editingId ? 'Save Route' : 'Create Route'}</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={nc.tabBar}>
            <button
              type="button"
              className={`${nc.tab} ${activeTab === 'details' ? nc.tabActive : nc.tabInactive}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              type="button"
              className={`${nc.tab} ${activeTab === 'headers' ? nc.tabActive : nc.tabInactive}`}
              onClick={() => setActiveTab('headers')}
            >
              Custom Headers
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }}>
            {/* Details Tab */}
            <div 
              style={{ 
                gridArea: '1 / 1 / 2 / 2',
                display: 'flex', 
                flexDirection: 'column', 
                gap: 16,
                opacity: activeTab === 'details' ? 1 : 0,
                visibility: activeTab === 'details' ? 'visible' : 'hidden',
                pointerEvents: activeTab === 'details' ? 'auto' : 'none',
                transition: 'opacity var(--transition-fast)'
              }}
            >
              <Input 
                label="Host" 
                placeholder="api.example.com" 
                value={formData.host}
                onChange={e => setFormData({ ...formData, host: e.target.value })}
              />
              <Input 
                label="Path Prefix (Optional)" 
                placeholder="e.g. /xyz (defaults to /)" 
                value={formData.path_prefix}
                onChange={e => setFormData({ ...formData, path_prefix: e.target.value })}
              />
              <Input 
                label="Upstream URL" 
                placeholder="https://internal-service:8080" 
                value={formData.upstream_url}
                onChange={e => setFormData({ ...formData, upstream_url: e.target.value })}
              />
            </div>

            {/* Custom Headers Tab */}
            <div 
              style={{ 
                gridArea: '1 / 1 / 2 / 2',
                display: 'flex', 
                flexDirection: 'column', 
                gap: 16,
                opacity: activeTab === 'headers' ? 1 : 0,
                visibility: activeTab === 'headers' ? 'visible' : 'hidden',
                pointerEvents: activeTab === 'headers' ? 'auto' : 'none',
                transition: 'opacity var(--transition-fast)'
              }}
            >
              {formHeaders.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No custom headers mapped to this route.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {formHeaders.map((h, i) => (
                    <div key={h.id ?? `local-${i}-${h.header_name}`} className={nc.rowChip}>
                      <div>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{h.header_name}</span>: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: 14 }}>{h.header_value}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="secondary" size="sm" type="button" onClick={() => handleStartEditHeader(i)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" type="button" onClick={() => handleRemoveLocalHeader(i)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={nc.sectionDivider}>
                <h4 style={{ margin: '0 0 12px 0' }}>
                  {editingHeaderIndex !== null ? 'Edit header value' : 'Add header'}
                </h4>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {editingHeaderIndex !== null
                    ? 'Name is fixed for an existing header. Change the value and click Save, or Cancel to discard changes.'
                    : 'Add a new header name and value, then click Add.'}
                </p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <Input
                      label="Name"
                      list={editingHeaderIndex === null ? 'cf-headers' : undefined}
                      placeholder="e.g. CF-Access-Client-Id"
                      value={newHeaderName}
                      onChange={(e) => setNewHeaderName(e.target.value)}
                      disabled={editingHeaderIndex !== null}
                    />
                    <datalist id="cf-headers">
                      <option value="CF-Access-Client-Id" />
                      <option value="CF-Access-Client-Secret" />
                    </datalist>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <Input 
                      label="Value" 
                      placeholder="Header value..." 
                      value={newHeaderValue}
                      onChange={(e) => setNewHeaderValue(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    {editingHeaderIndex !== null ? (
                      <Button variant="secondary" type="button" onClick={resetHeaderDraft}>
                        Cancel
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleSaveHeaderDraft}
                      disabled={!newHeaderName || !newHeaderValue}
                    >
                      {editingHeaderIndex !== null ? 'Save' : 'Add'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="Delete route?"
        message="This removes the route and its configuration. Clients may lose access until you configure another route."
        confirmLabel="Delete route"
        variant="danger"
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
