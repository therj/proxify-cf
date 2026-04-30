import React, { useState, useEffect } from 'react';
import { Table, Th, Td } from '../components/ui/Table';
import { api } from '../lib/api';
import { AuditLog } from '@proxify-cf/shared';

export const Audit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatTarget = (action: string, target: string, metaStr?: string) => {
    let meta: any = {};
    if (metaStr) {
      try { meta = JSON.parse(metaStr); } catch (e) {}
    }
    
    if (action === 'MINT_TOKEN' && meta.label) return `Token "${meta.label}"`;
    if (action.includes('CLIENT') && meta.name) return `Client "${meta.name}"`;
    if (action.includes('ROUTE') && meta.host) return `Route ${meta.host}${meta.path_prefix !== '/' ? meta.path_prefix : ''}`;
    if (action.includes('KEY') && meta.client_id) return `Key for Client ${meta.client_id.slice(0,8)}...`;
    if (action.includes('HEADER') && meta.header_name) return `Header "${meta.header_name}"`;
    if (action === 'CREATE_GRANT') return `Access Grant`;

    if (target && target.length > 20) return target.slice(0, 8) + '...';
    return target;
  };

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await api.audit.list();
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Audit Log</h2>

      <Table>
        <thead>
          <tr>
            <Th>Timestamp</Th>
            <Th>Actor</Th>
            <Th>Action</Th>
            <Th>Target</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><Td colSpan={4} style={{ textAlign: 'center' }}>Loading audit logs...</Td></tr>
          ) : logs.length === 0 ? (
            <tr><Td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No audit logs found.</Td></tr>
          ) : (
            logs.map((a) => (
              <tr key={a.id}>
                <Td>{new Date(a.ts).toLocaleString()}</Td>
                <Td>{a.actor}</Td>
                <Td>
                  <span style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 12
                  }}>
                    {a.action}
                  </span>
                </Td>
                <Td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontFamily: 'monospace' }}>{formatTarget(a.action, a.target, a.meta)} <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({a.target.slice(0,8)}...)</span></div>
                    {a.meta && (
                      <details style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <summary style={{ cursor: 'pointer', outline: 'none', userSelect: 'none' }}>View Details</summary>
                        <pre style={{ margin: '8px 0 0 0', padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4, overflowX: 'auto' }}>
                          {(() => {
                            try { return JSON.stringify(JSON.parse(a.meta as string), null, 2); }
                            catch (e) { return a.meta as string; }
                          })()}
                        </pre>
                      </details>
                    )}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};
