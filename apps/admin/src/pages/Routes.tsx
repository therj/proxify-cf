import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Table, Th, Td } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Route } from '@proxify-cf/shared';

export const Routes = () => {
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

  // UI State
  const [activeTab, setActiveTab] = useState<'details' | 'headers'>('details');

  const loadRoutes = async () => {
    setIsLoading(true);
    try {
      const data = await api.routes.list();
      setRoutes(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ host: '', path_prefix: '/', upstream_url: '' });
    setFormHeaders([]);
    setError(null);
    setActiveTab('details');
    setModalOpen(true);
  };

  const handleOpenEdit = async (r: Route) => {
    setEditingId(r.id);
    setFormData({ host: r.host, path_prefix: r.path_prefix, upstream_url: r.upstream_url });
    setFormHeaders([]); // Clear previous
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
        
        // Add new headers
        for (const h of formHeaders) {
          if (!h.id) {
            await api.routes.addHeader(routeId, { header_name: h.header_name, header_value: h.header_value });
          }
        }
      }

      setModalOpen(false);
      await loadRoutes();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;
    try {
      await api.routes.remove(id);
      await loadRoutes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLocalHeader = () => {
    if (!newHeaderName || !newHeaderValue) return;
    setFormHeaders([...formHeaders, { header_name: newHeaderName, header_value: newHeaderValue }]);
    setNewHeaderName('');
    setNewHeaderValue('');
  };

  const handleEditLocalHeader = (idx: number) => {
    const h = formHeaders[idx];
    setNewHeaderName(h.header_name);
    setNewHeaderValue(h.header_value);
    setFormHeaders(formHeaders.filter((_, i) => i !== idx));
  };

  const handleRemoveLocalHeader = (idx: number) => {
    setFormHeaders(formHeaders.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Routes</h2>
        <Button onClick={handleOpenCreate}>
          <Plus size={16} /> Add Route
        </Button>
      </div>

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
          {isLoading ? (
            <tr><Td colSpan={4} style={{ textAlign: 'center' }}>Loading routes...</Td></tr>
          ) : routes.length === 0 ? (
            <tr><Td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No routes found.</Td></tr>
          ) : (
            routes.map((route) => (
              <tr key={route.id}>
                <Td style={{ fontWeight: 500 }}>{route.host}</Td>
                <Td style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{route.path_prefix}</Td>
                <Td style={{ color: 'var(--text-secondary)' }}>{route.upstream_url}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(route)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(route.id)}>Delete</Button>
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingId ? "Edit Route" : "Create New Route"}
        width={700}
        error={error}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} isLoading={isSaving}>{editingId ? 'Save Route' : 'Create Route'}</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 350 }}>
          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div 
              onClick={() => setActiveTab('details')} 
              style={{ cursor: 'pointer', paddingBottom: 12, fontWeight: 500, color: activeTab === 'details' ? '#fff' : 'var(--text-secondary)', borderBottom: activeTab === 'details' ? '2px solid var(--accent-primary)' : '2px solid transparent', transition: 'all 0.2s' }}
            >
              Details
            </div>
            <div 
              onClick={() => setActiveTab('headers')} 
              style={{ cursor: 'pointer', paddingBottom: 12, fontWeight: 500, color: activeTab === 'headers' ? '#fff' : 'var(--text-secondary)', borderBottom: activeTab === 'headers' ? '2px solid var(--accent-primary)' : '2px solid transparent', transition: 'all 0.2s' }}
            >
              Custom Headers
            </div>
          </div>

          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          )}

          {activeTab === 'headers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formHeaders.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No custom headers mapped to this route.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {formHeaders.map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 8 }}>
                      <div>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{h.header_name}</span>: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: 14 }}>{h.header_value}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="secondary" size="sm" onClick={() => handleEditLocalHeader(i)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => handleRemoveLocalHeader(i)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Add / Edit Header</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Name</label>
                    <input 
                      type="text"
                      list="cf-headers"
                      placeholder="e.g. CF-Access-Client-Id"
                      value={newHeaderName}
                      onChange={e => setNewHeaderName(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }}
                    />
                    <datalist id="cf-headers">
                      <option value="CF-Access-Client-Id" />
                      <option value="CF-Access-Client-Secret" />
                    </datalist>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input 
                      label="Value" 
                      placeholder="Header value..." 
                      value={newHeaderValue}
                      onChange={e => setNewHeaderValue(e.target.value)}
                    />
                  </div>
                  <Button variant="secondary" onClick={handleAddLocalHeader} disabled={!newHeaderName || !newHeaderValue}>Add</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
