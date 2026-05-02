import React, { useState, useEffect, useMemo } from 'react';
import { Table, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { ACCESS_OUTCOME_VALUES } from '@proxify-cf/shared';
import type { AccessLog, Client, Route } from '@proxify-cf/shared';
import nc from '../components/ui/nativeControls.module.css';

const FETCH_LIMIT = 200;

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

function formatDetail(detail: string | null): string {
  if (detail == null || detail === '') return '';
  try {
    return JSON.stringify(JSON.parse(detail), null, 2);
  } catch {
    return detail;
  }
}

export const Access = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterClientId, setFilterClientId] = useState('');
  const [filterRouteId, setFilterRouteId] = useState('');
  const [filterKid, setFilterKid] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [detailRow, setDetailRow] = useState<AccessLog | null>(null);

  const nameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const routeLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of routes) {
      m.set(r.id, `${r.host}${r.path_prefix !== '/' ? r.path_prefix : ''}`);
    }
    return m;
  }, [routes]);

  const filtersActive = !!(filterClientId || filterRouteId || filterKid || filterOutcome);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clientsData, routesData] = await Promise.all([api.clients.list(), api.routes.list()]);
        if (!cancelled) {
          setClients(clientsData);
          setRoutes(routesData);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await api.access.list({
          ...(filterClientId ? { client_id: filterClientId } : {}),
          ...(filterRouteId ? { route_id: filterRouteId } : {}),
          ...(filterKid.trim() ? { kid: filterKid.trim() } : {}),
          ...(filterOutcome ? { outcome: filterOutcome } : {}),
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
  }, [filterClientId, filterRouteId, filterKid, filterOutcome]);

  const clearFilters = () => {
    setFilterClientId('');
    setFilterRouteId('');
    setFilterKid('');
    setFilterOutcome('');
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Access logs</h2>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 720 }}>
          Proxied request telemetry (JWT checks and upstream outcomes). Separate from the administrative{' '}
          <strong style={{ fontWeight: 600 }}>Audit log</strong>.
        </p>
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
          <label
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
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
          <label
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Route
          </label>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
          <label
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Outcome
          </label>
          <select className={nc.select} value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)}>
            <option value="">All outcomes</option>
            {ACCESS_OUTCOME_VALUES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 160px', minWidth: 140 }}>
          <label
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Key ID (kid)
          </label>
          <Input value={filterKid} onChange={(e) => setFilterKid(e.target.value)} placeholder="Exact match" />
        </div>
        <Button variant="secondary" type="button" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Time</Th>
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
                  <Td>{formatTs(row.ts)}</Td>
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
        title={detailRow ? `Access · ${formatTs(detailRow.ts)}` : 'Access entry'}
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
