import React, { useState, useEffect, useMemo } from 'react';
import { Table, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { AuditLog, Client } from '@proxify-cf/shared';
import { formatAuditSummary, effectiveClientId, formatAuditTimestamp } from '../lib/auditDisplay';
import nc from '../components/ui/nativeControls.module.css';
import { AuditEmptyIllustration } from '../components/empty/AuditEmptyIllustration';

const FETCH_LIMIT = 200;

function formatAuditMeta(meta: string | null | undefined): string {
  if (meta == null || meta === '') return '';
  try {
    return JSON.stringify(JSON.parse(meta), null, 2);
  } catch {
    return meta;
  }
}

export const Audit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterClientId, setFilterClientId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [targetDebounced, setTargetDebounced] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const nameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const summaryStats = useMemo(() => {
    if (logs.length === 0) return null;
    const byAction = new Map<string, number>();
    const byClient = new Map<string, number>();
    let minTs = Infinity;
    let maxTs = -Infinity;
    for (const a of logs) {
      byAction.set(a.action, (byAction.get(a.action) ?? 0) + 1);
      const cid = effectiveClientId(a);
      const label = cid ? nameById.get(cid) ?? `${cid.slice(0, 8)}…` : '—';
      byClient.set(label, (byClient.get(label) ?? 0) + 1);
      const t = new Date(a.ts).getTime();
      if (!Number.isNaN(t)) {
        minTs = Math.min(minTs, t);
        maxTs = Math.max(maxTs, t);
      }
    }
    return {
      total: logs.length,
      byAction: [...byAction.entries()]
        .sort((x, y) => y[1] - x[1])
        .map(([action, count]) => ({ action, count })),
      byClient: [...byClient.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 20)
        .map(([label, count]) => ({ label, count })),
      timeRange:
        minTs !== Infinity && maxTs !== -Infinity
          ? { start: new Date(minTs), end: new Date(maxTs) }
          : null,
      mayHaveMore: logs.length >= FETCH_LIMIT,
    };
  }, [logs, nameById]);

  const filtersActive = !!(filterClientId || filterAction || targetDebounced);

  useEffect(() => {
    const t = setTimeout(() => setTargetDebounced(targetInput.trim()), 400);
    return () => clearTimeout(t);
  }, [targetInput]);

  useEffect(() => {
    const boot = async () => {
      try {
        const [clientsData, actionsData] = await Promise.all([
          api.clients.list(),
          api.audit.actions(),
        ]);
        setClients(clientsData);
        setActions(actionsData);
      } catch (e) {
        console.error(e);
      }
    };
    boot();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await api.audit.list({
          ...(filterClientId ? { client_id: filterClientId } : {}),
          ...(filterAction ? { action: filterAction } : {}),
          ...(targetDebounced ? { target: targetDebounced } : {}),
          limit: FETCH_LIMIT,
        });
        if (!cancelled) setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterClientId, filterAction, targetDebounced]);

  const clearFilters = () => {
    setFilterClientId('');
    setFilterAction('');
    setTargetInput('');
    setTargetDebounced('');
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>Audit Log</h2>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setDetailLog(null);
            setSummaryOpen(true);
          }}
          disabled={isLoading}
        >
          Summary
        </Button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-end',
          marginBottom: 24,
          padding: 16,
          borderRadius: 8,
          border: '1px solid var(--surface-border)',
          background: 'var(--surface-bg)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Client
          </label>
          <select className={nc.select} value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)}>
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Action
          </label>
          <select className={nc.select} value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 220px', minWidth: 200 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Target contains
          </label>
          <Input value={targetInput} onChange={(e) => setTargetInput(e.target.value)} placeholder="Substring match on target field" />
        </div>
        <Button variant="secondary" type="button" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>

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
          {isLoading ? (
            <tr>
              <Td colSpan={5} style={{ textAlign: 'center' }}>
                Loading audit logs...
              </Td>
            </tr>
          ) : logs.length === 0 ? (
            <tr>
              <Td colSpan={5} style={{ padding: 0, borderBottom: 'none', verticalAlign: 'top' }}>
                <div
                  style={{
                    padding: '40px 24px 48px',
                    textAlign: 'center',
                    maxWidth: 420,
                    margin: '0 auto',
                  }}
                >
                  <AuditEmptyIllustration
                    style={{
                      display: 'block',
                      margin: '0 auto 20px',
                      color: 'var(--text-secondary)',
                    }}
                  />
                  <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {filtersActive ? 'No matching audit entries' : 'No audit activity yet'}
                  </h3>
                  <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {filtersActive
                      ? 'Try widening your filters or clear them to see all events.'
                      : 'Changes to clients, routes, keys, and grants will show up here.'}
                  </p>
                  {filtersActive ? (
                    <Button type="button" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          ) : (
            logs.map((a) => {
              const cid = effectiveClientId(a);
              const clientLabel = cid ? nameById.get(cid) ?? cid.slice(0, 8) + '…' : '—';
              const summary = formatAuditSummary(a, nameById);
              const openDetail = () => {
                setSummaryOpen(false);
                setDetailLog(a);
              };
              return (
                <tr
                  key={a.id}
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  aria-label={`Open audit entry: ${a.action}, ${formatAuditTimestamp(a.ts)}`}
                  onClick={openDetail}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDetail();
                    }
                  }}
                >
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

      <Modal
        isOpen={detailLog != null}
        onClose={() => setDetailLog(null)}
        title={
          detailLog ? `${detailLog.action} · ${formatAuditTimestamp(detailLog.ts)}` : 'Audit entry'
        }
        width={640}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setDetailLog(null)}>
              Close
            </Button>
          </div>
        }
      >
        {detailLog ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(100px, 120px) 1fr',
                gap: '8px 16px',
                fontSize: 14,
                margin: 0,
              }}
            >
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Client</dt>
              <dd style={{ margin: 0, wordBreak: 'break-word' }}>
                {(() => {
                  const cid = effectiveClientId(detailLog);
                  return cid ? nameById.get(cid) ?? `${cid.slice(0, 8)}…` : '—';
                })()}
              </dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Action</dt>
              <dd style={{ margin: 0 }}>
                <span
                  style={{
                    background: 'var(--surface-hover)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {detailLog.action}
                </span>
              </dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Actor</dt>
              <dd style={{ margin: 0, wordBreak: 'break-word' }}>{detailLog.actor}</dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Timestamp</dt>
              <dd style={{ margin: 0 }}>{formatAuditTimestamp(detailLog.ts)}</dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Target</dt>
              <dd style={{ margin: 0, wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                {detailLog.target || '—'}
              </dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Summary</dt>
              <dd style={{ margin: 0 }}>{formatAuditSummary(detailLog, nameById)}</dd>
            </dl>
            <div>
              <h4
                style={{
                  margin: '0 0 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                }}
              >
                Metadata
              </h4>
              {detailLog.meta ? (
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: 'var(--details-pre-bg)',
                    borderRadius: 8,
                    overflowX: 'auto',
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  {formatAuditMeta(detailLog.meta)}
                </pre>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>No metadata payload for this entry.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Audit summary"
        width={560}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setSummaryOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {!summaryStats ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            No audit entries match your current filters. Adjust filters or wait for activity to appear here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)' }}>
              <strong>{summaryStats.total}</strong> event{summaryStats.total === 1 ? '' : 's'} in this view
              {filtersActive ? ' (filters applied)' : ''}.
            </p>
            {summaryStats.mayHaveMore ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                The table loads at most {FETCH_LIMIT} matching rows (newest first). Totals reflect only those rows;
                older events may exist beyond this window.
              </p>
            ) : null}
            {summaryStats.timeRange ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                Time span in this view:{' '}
                <span style={{ color: 'var(--text-primary)' }}>
                  {formatAuditTimestamp(summaryStats.timeRange.start.getTime())} —{' '}
                  {formatAuditTimestamp(summaryStats.timeRange.end.getTime())}
                </span>
              </p>
            ) : null}

            <div>
              <h4
                style={{
                  margin: '0 0 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                }}
              >
                By action
              </h4>
              <Table>
                <thead>
                  <tr>
                    <Th>Action</Th>
                    <Th style={{ width: 100, textAlign: 'right' }}>Count</Th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStats.byAction.map((row) => (
                    <tr key={row.action}>
                      <Td>
                        <span
                          style={{
                            background: 'var(--surface-hover)',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                        >
                          {row.action}
                        </span>
                      </Td>
                      <Td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.count}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <div>
              <h4
                style={{
                  margin: '0 0 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                }}
              >
                By client
              </h4>
              <Table>
                <thead>
                  <tr>
                    <Th>Client</Th>
                    <Th style={{ width: 100, textAlign: 'right' }}>Count</Th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStats.byClient.map((row) => (
                    <tr key={row.label}>
                      <Td>{row.label}</Td>
                      <Td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.count}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
