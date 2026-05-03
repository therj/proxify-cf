import React, { useState, useEffect, useMemo } from 'react';
import { Table, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { ACCESS_OUTCOME_VALUES } from '@proxify-cf/shared';
import type { AccessLog, Client, Key, Route } from '@proxify-cf/shared';
import nc from '../components/ui/nativeControls.module.css';
import tableStyles from '../components/ui/Table.module.css';
import { AdminPageTitle } from '../components/AdminPageTitle';
import { useAdminApiRetryEpoch } from '../context/AdminApiRetryContext';
import { DataLoadError } from '../components/DataLoadError';
import { formatDateTime } from '../lib/formatDateTime';
import { loadErrorMessage } from '../lib/loadErrorMessage';

const FETCH_LIMIT = 200;

function formatDetail(detail: string | null): string {
  if (detail == null || detail === '') return '';
  try {
    return JSON.stringify(JSON.parse(detail), null, 2);
  } catch {
    return detail;
  }
}

export const Access = () => {
  const adminApiRetryEpoch = useAdminApiRetryEpoch();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [keys, setKeys] = useState<Key[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refError, setRefError] = useState<string | null>(null);
  const [refRetryKey, setRefRetryKey] = useState(0);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [keysRetryKey, setKeysRetryKey] = useState(0);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logsRetryKey, setLogsRetryKey] = useState(0);

  const [filterClientId, setFilterClientId] = useState('');
  const [filterRouteId, setFilterRouteId] = useState('');
  const [filterKid, setFilterKid] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [filterHostPath, setFilterHostPath] = useState('');
  const [filterHostPathDebounced, setFilterHostPathDebounced] = useState('');
  const [detailRow, setDetailRow] = useState<AccessLog | null>(null);

  const nameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const routeLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of routes) {
      m.set(r.id, `${r.host}${r.path_prefix !== '/' ? r.path_prefix : ''}`);
    }
    return m;
  }, [routes]);

  const filtersActive = !!(
    filterClientId ||
    filterRouteId ||
    filterKid !== '' ||
    filterOutcome ||
    filterHostPathDebounced
  );

  useEffect(() => {
    const t = window.setTimeout(() => setFilterHostPathDebounced(filterHostPath.trim()), 400);
    return () => window.clearTimeout(t);
  }, [filterHostPath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clientsData, routesData] = await Promise.all([api.clients.list(), api.routes.list()]);
        if (!cancelled) {
          setClients(clientsData);
          setRoutes(routesData);
          setRefError(null);
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) setRefError(loadErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refRetryKey, adminApiRetryEpoch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const keysData = await api.keys.list(filterClientId ? { client_id: filterClientId } : undefined);
        if (cancelled) return;
        setKeys(keysData);
        setKeysError(null);
        setFilterKid((prev) => (prev && !keysData.some((k) => k.kid === prev) ? '' : prev));
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          setKeys([]);
          setKeysError(loadErrorMessage(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterClientId, keysRetryKey, adminApiRetryEpoch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLogsError(null);
      try {
        const data = await api.access.list({
          ...(filterClientId ? { client_id: filterClientId } : {}),
          ...(filterRouteId ? { route_id: filterRouteId } : {}),
          ...(filterKid ? { kid: filterKid } : {}),
          ...(filterOutcome ? { outcome: filterOutcome } : {}),
          ...(filterHostPathDebounced ? { host_path: filterHostPathDebounced } : {}),
          limit: FETCH_LIMIT,
        });
        if (!cancelled) {
          setLogs(data);
          setLogsError(null);
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          setLogs([]);
          setLogsError(loadErrorMessage(e));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    filterClientId,
    filterRouteId,
    filterKid,
    filterOutcome,
    filterHostPathDebounced,
    logsRetryKey,
    adminApiRetryEpoch,
  ]);

  const clearFilters = () => {
    setFilterClientId('');
    setFilterRouteId('');
    setFilterKid('');
    setFilterOutcome('');
    setFilterHostPath('');
    setFilterHostPathDebounced('');
  };

  return (
    <div>
      <AdminPageTitle title="Access Logs" />

      {refError || keysError ? (
        <div style={{ marginBottom: 16 }}>
          <DataLoadError
            variant="banner"
            title="Filter bar"
            message={[refError && `Clients & routes — ${refError}`, keysError && `Signing keys — ${keysError}`]
              .filter((line): line is string => Boolean(line))
              .join('\n')}
            onRetry={() => {
              setRefRetryKey((k) => k + 1);
              setKeysRetryKey((k) => k + 1);
            }}
          />
        </div>
      ) : null}

      <Table
        className={tableStyles.tableFixed}
        toolbar={
          <div className={tableStyles.filterStrip}>
            <div className={`${tableStyles.filterStripField} ${tableStyles.filterStripClient}`}>
              <label className={nc.fieldLabel}>Client</label>
              <select className={nc.select} value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)}>
                <option value="">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${tableStyles.filterStripField} ${tableStyles.filterStripGrow}`}>
              <label className={nc.fieldLabel}>Route</label>
              <select className={nc.select} value={filterRouteId} onChange={(e) => setFilterRouteId(e.target.value)}>
                <option value="">All routes</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.host}
                    {r.path_prefix !== '/' ? r.path_prefix : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${tableStyles.filterStripField} ${tableStyles.filterStripNarrow}`}>
              <label className={nc.fieldLabel}>Keys</label>
              <select className={nc.select} value={filterKid} onChange={(e) => setFilterKid(e.target.value)} title="Signing key (JWT kid)">
                <option value="">All keys</option>
                {keys.map((k) => {
                  const clientName = nameById.get(k.client_id) ?? k.client_id.slice(0, 8) + '…';
                  const shortKid = `${k.kid.slice(0, 8)}…`;
                  return (
                    <option key={k.kid} value={k.kid} title={`${clientName} · ${k.mode} · ${k.kid}`}>
                      {shortKid}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className={`${tableStyles.filterStripField} ${tableStyles.filterStripNarrow}`}>
              <label className={nc.fieldLabel}>Outcome</label>
              <select className={nc.select} value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)}>
                <option value="">All outcomes</option>
                {ACCESS_OUTCOME_VALUES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${tableStyles.filterStripField} ${tableStyles.filterStripHostPath}`}>
              <label className={nc.fieldLabel}>Host / path contains</label>
              <input
                className={nc.select}
                value={filterHostPath}
                onChange={(e) => setFilterHostPath(e.target.value)}
                placeholder="Substring on host or path"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className={tableStyles.filterStripActions}>
              <Button variant="secondary" type="button" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </div>
        }
      >
        <colgroup>
          <col style={{ width: '13%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '8%' }} />
        </colgroup>
        <thead>
          <tr>
            <Th>Timestamp</Th>
            <Th>Host / path</Th>
            <Th>Method</Th>
            <Th>Outcome</Th>
            <Th>Client</Th>
            <Th>Route</Th>
            <Th>Upstream</Th>
            <Th>ms</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <Td colSpan={8} style={{ textAlign: 'center' }}>
                Loading access logs...
              </Td>
            </tr>
          ) : logsError ? (
            <tr>
              <Td colSpan={8} style={{ padding: '24px 16px', verticalAlign: 'top' }}>
                <DataLoadError message={logsError} onRetry={() => setLogsRetryKey((k) => k + 1)} />
              </Td>
            </tr>
          ) : logs.length === 0 ? (
            <tr>
              <Td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                {filtersActive ? 'No matching access events.' : 'No proxied traffic recorded yet.'}
              </Td>
            </tr>
          ) : (
            logs.map((row) => {
              const openDetail = () => setDetailRow(row);
              const clientLabel = row.client_id
                ? nameById.get(row.client_id) ?? `${row.client_id.slice(0, 8)}…`
                : '—';
              const routeLabel = row.route_id ? routeLabelById.get(row.route_id) ?? row.route_id.slice(0, 8) + '…' : '—';
              return (
                <tr
                  key={row.id}
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onClick={openDetail}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDetail();
                    }
                  }}
                >
                  <Td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{formatDateTime(row.ts)}</Td>
                  <Td>
                    <div style={{ fontSize: 13, wordBreak: 'break-word' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{row.host}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{row.path}</span>
                    </div>
                  </Td>
                  <Td>{row.method}</Td>
                  <Td>
                    <span
                      style={{
                        background: 'var(--surface-hover)',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      {row.outcome}
                    </span>
                  </Td>
                  <Td>{clientLabel}</Td>
                  <Td style={{ fontSize: 13 }}>{routeLabel}</Td>
                  <Td>{row.upstream_status ?? '—'}</Td>
                  <Td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.latency_ms ?? '—'}</Td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      {logs.length >= FETCH_LIMIT ? (
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          Showing up to {FETCH_LIMIT} newest rows. Narrow filters to find older events.
        </p>
      ) : null}

      <Modal
        isOpen={detailRow != null}
        onClose={() => setDetailRow(null)}
        title={detailRow ? `Access · ${formatDateTime(detailRow.ts)}` : 'Access entry'}
        width={640}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setDetailRow(null)}>
              Close
            </Button>
          </div>
        }
      >
        {detailRow ? (
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
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Outcome</dt>
              <dd style={{ margin: 0 }}>
                <span
                  style={{
                    background: 'var(--surface-hover)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {detailRow.outcome}
                </span>
              </dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Host / path</dt>
              <dd style={{ margin: 0, wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                {detailRow.host}
                {detailRow.path}
              </dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Method</dt>
              <dd style={{ margin: 0 }}>{detailRow.method}</dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Client</dt>
              <dd style={{ margin: 0 }}>
                {detailRow.client_id
                  ? nameById.get(detailRow.client_id) ?? detailRow.client_id
                  : '—'}
              </dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>kid / jti</dt>
              <dd style={{ margin: 0, wordBreak: 'break-all', fontSize: 13 }}>
                {detailRow.kid ?? '—'} / {detailRow.jti ?? '—'}
              </dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Upstream status</dt>
              <dd style={{ margin: 0 }}>{detailRow.upstream_status ?? '—'}</dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Latency</dt>
              <dd style={{ margin: 0 }}>{detailRow.latency_ms != null ? `${detailRow.latency_ms} ms` : '—'}</dd>
              <dt style={{ color: 'var(--text-secondary)', margin: 0 }}>Client IP</dt>
              <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                {detailRow.client_ip ?? '—'}
              </dd>
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
                Detail
              </h4>
              {detailRow.detail ? (
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
                  {formatDetail(detailRow.detail)}
                </pre>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>No extra detail for this row.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
