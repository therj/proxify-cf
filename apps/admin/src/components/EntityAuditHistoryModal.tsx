import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Table, Th, Td } from './ui/Table';
import { api } from '../lib/api';
import type { AuditLog, Client } from '@proxify-cf/shared';
import { effectiveClientId, formatAuditSummary, formatAuditTimestamp } from '../lib/auditDisplay';
import { TableBodyStableSlot, TableSkeletonGrid } from './ui/Skeleton';

const ENTITY_AUDIT_LIMIT = 100;

export type EntityAuditScope =
  | { type: 'client'; clientId: string }
  | { type: 'key'; kid: string }
  | { type: 'grant'; clientId: string; routeId: string }
  | { type: 'route'; routeId: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  scope: EntityAuditScope | null;
};

function scopeToApiFilters(scope: EntityAuditScope) {
  switch (scope.type) {
    case 'client':
      return { client_id: scope.clientId, limit: ENTITY_AUDIT_LIMIT };
    case 'key':
      return { kid: scope.kid, limit: ENTITY_AUDIT_LIMIT };
    case 'grant':
      return { client_id: scope.clientId, route_id: scope.routeId, limit: ENTITY_AUDIT_LIMIT };
    case 'route':
      return { route_id: scope.routeId, limit: ENTITY_AUDIT_LIMIT };
  }
}

export const EntityAuditHistoryModal: React.FC<Props> = ({ isOpen, onClose, title, subtitle, scope }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const nameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  useEffect(() => {
    if (!isOpen || !scope) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [clientsData, logsData] = await Promise.all([
          api.clients.list(),
          api.audit.list(scopeToApiFilters(scope)),
        ]);
        if (!cancelled) {
          setClients(clientsData);
          setLogs(logsData);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, scope]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width={720}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {subtitle ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
            {subtitle}
          </p>
        ) : null}
        <div style={{ minHeight: 360 }}>
          <Table>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Action</Th>
                <Th>Actor</Th>
                <Th>Timestamp</Th>
                <Th>Summary</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableBodyStableSlot colSpan={5} minHeight="clamp(260px, 35vh, 400px)">
                  <TableSkeletonGrid columns={5} columnFr={[18, 14, 14, 18, 36]} rows={8} />
                </TableBodyStableSlot>
              ) : logs.length === 0 ? (
                <tr>
                  <Td colSpan={5} style={{ color: 'var(--text-secondary)', fontSize: 14, verticalAlign: 'top' }}>
                    No audit entries found for this scope.
                  </Td>
                </tr>
              ) : (
                logs.map((a) => {
                  const cid = effectiveClientId(a);
                  const clientLabel = cid ? nameById.get(cid) ?? `${cid.slice(0, 8)}…` : '—';
                  const summary = formatAuditSummary(a, nameById);
                  return (
                    <tr key={a.id}>
                      <Td>{clientLabel}</Td>
                      <Td>
                        <span
                          style={{
                            background: 'var(--surface-hover)',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                        >
                          {a.action}
                        </span>
                      </Td>
                      <Td>{a.actor}</Td>
                      <Td>{formatAuditTimestamp(a.ts)}</Td>
                      <Td>{summary}</Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
        {!loading && logs.length >= ENTITY_AUDIT_LIMIT ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Showing the {ENTITY_AUDIT_LIMIT} most recent matching entries. Older events may exist.
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
