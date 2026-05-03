import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import type { LucideIcon } from 'lucide-react';
import { Users, Route, Key, KeyRound, Activity, ScrollText } from 'lucide-react';
import { api } from '../lib/api';
import { AuditLog, AccessLog, Client } from '@proxify-cf/shared';
import { formatAuditSummary, effectiveClientId } from '../lib/auditDisplay';
import { formatDateTime } from '../lib/formatDateTime';
import { AdminPageTitle } from '../components/AdminPageTitle';
import { useAdminApiRetryEpoch } from '../context/AdminApiRetryContext';

const DASHBOARD_ACCESS_LIMIT = 50;
const DASHBOARD_AUDIT_LIMIT = 10;
/** Dashboard lists only show events from this rolling window (ms). */
const DASHBOARD_LOG_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const sectionFooterLinks: React.CSSProperties = {
  marginTop: 10,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 4,
};

const sectionFooterLink: React.CSSProperties = {
  padding: 0,
  color: 'var(--accent-primary)',
  font: 'inherit',
  fontSize: 12,
  fontWeight: 400,
  textDecoration: 'underline',
  textAlign: 'left',
};

type DashboardMetric = {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  to: string;
};

const metricLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
  borderRadius: 'var(--radius-md)',
  outlineOffset: 2,
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const adminApiRetryEpoch = useAdminApiRetryEpoch();
  const [metrics, setMetrics] = useState<DashboardMetric[]>([
    { label: 'Total Clients', value: '…', icon: Users, color: '#a5b4fc', to: '/admin/clients' },
    { label: 'Active Routes', value: '…', icon: Route, color: '#86efac', to: '/admin/routes' },
    { label: 'Signing keys', value: '…', icon: Key, color: '#c4b5fd', to: '/admin/keys' },
    { label: 'Issued JWTs', value: '…', icon: KeyRound, color: '#fca5a5', to: '/admin/keys' },
    { label: 'Audit Logs', value: '…', icon: Activity, color: '#fde047', to: '/admin/audit' },
    { label: 'Access Logs', value: '…', icon: ScrollText, color: '#93c5fd', to: '/admin/access' },
  ]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [recentAccess, setRecentAccess] = useState<AccessLog[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditPreviewFailed, setAuditPreviewFailed] = useState(false);
  const [accessPreviewFailed, setAccessPreviewFailed] = useState(false);

  const nameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const accessSeeMore =
    !isLoading && !accessPreviewFailed && recentAccess.length >= DASHBOARD_ACCESS_LIMIT;
  const auditSeeMore =
    !isLoading && !auditPreviewFailed && recentActivity.length >= DASHBOARD_AUDIT_LIMIT;

  useEffect(() => {
    const loadDashboard = async () => {
      const logSinceTs = Date.now() - DASHBOARD_LOG_WINDOW_MS;
      const results = await Promise.allSettled([
        api.clients.list(),
        api.routes.list(),
        api.keys.list(),
        api.keys.listTokens(),
        api.access.list({ limit: DASHBOARD_ACCESS_LIMIT, since: logSinceTs }),
        api.audit.list({ limit: DASHBOARD_AUDIT_LIMIT, since: logSinceTs }),
        api.access.count(),
        api.audit.count(),
      ]);

      const r0 = results[0];
      const r1 = results[1];
      const r2 = results[2];
      const r3 = results[3];
      const r4 = results[4];
      const r5 = results[5];
      const r6 = results[6];
      const r7 = results[7];

      const clientsList = r0.status === 'fulfilled' ? r0.value : [];
      const routes = r1.status === 'fulfilled' ? r1.value : [];
      const signingKeys = r2.status === 'fulfilled' ? r2.value : [];
      const tokens = r3.status === 'fulfilled' ? r3.value : [];
      const accessRows = r4.status === 'fulfilled' ? r4.value : [];
      const audit = r5.status === 'fulfilled' ? r5.value : [];
      const accessTotal = r6.status === 'fulfilled' ? r6.value : null;
      const auditTotal = r7.status === 'fulfilled' ? r7.value : null;

      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Dashboard request ${i} failed`, r.reason);
        }
      });

      setAuditPreviewFailed(r5.status === 'rejected');
      setAccessPreviewFailed(r4.status === 'rejected');

      setClients(clientsList);

      const countOrDash = (r: PromiseSettledResult<number>, n: number | null) =>
        r.status === 'fulfilled' && n != null ? String(n) : '—';

      setMetrics([
        {
          label: 'Total Clients',
          value: r0.status === 'fulfilled' ? String(clientsList.length) : '—',
          icon: Users,
          color: '#a5b4fc',
          to: '/admin/clients',
        },
        {
          label: 'Active Routes',
          value: r1.status === 'fulfilled' ? String(routes.length) : '—',
          icon: Route,
          color: '#86efac',
          to: '/admin/routes',
        },
        {
          label: 'Signing keys',
          value: r2.status === 'fulfilled' ? String(signingKeys.length) : '—',
          icon: Key,
          color: '#c4b5fd',
          to: '/admin/keys',
        },
        {
          label: 'Issued JWTs',
          value: r3.status === 'fulfilled' ? String(tokens.length) : '—',
          icon: KeyRound,
          color: '#fca5a5',
          to: '/admin/keys',
        },
        {
          label: 'Audit Logs',
          value: countOrDash(r7, auditTotal),
          icon: Activity,
          color: '#fde047',
          to: '/admin/audit',
        },
        {
          label: 'Access Logs',
          value: countOrDash(r6, accessTotal),
          icon: ScrollText,
          color: '#93c5fd',
          to: '/admin/access',
        },
      ]);

      setRecentAccess(accessRows);
      setRecentActivity(audit);
      setIsLoading(false);
    };
    loadDashboard();
  }, [adminApiRetryEpoch]);

  const listCardScroll: React.CSSProperties = {
    maxHeight: 'min(60vh, 520px)',
    overflowY: 'auto',
  };

  return (
    <div>
      <AdminPageTitle title="Dashboard" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
          marginBottom: 32,
        }}
      >
        {metrics.map((m, i) => (
          <Link key={i} to={m.to} style={metricLinkStyle} title={`Open ${m.label}`}>
            <Card style={{ height: '100%', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${m.color}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: m.color,
                  }}
                >
                  <m.icon size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{m.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{m.value}</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <section style={{ marginBottom: 36 }}>
        <h3 style={{ marginBottom: 4 }}>Recent Admin Activity</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Last 7 days</p>
        <Card style={{ marginTop: 0, ...listCardScroll }}>
          {isLoading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : auditPreviewFailed ? (
            <div style={{ color: 'var(--text-secondary)' }}>
              Could not load this preview (request failed). Open Audit Logs to retry.
            </div>
          ) : recentActivity.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)' }}>No admin activity in the last 7 days.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentActivity.map((activity, i) => {
                const openRelatedDetail = () => {
                  if (activity.route_id) {
                    navigate(`/admin/routes/${activity.route_id}`);
                    return;
                  }
                  const cid = effectiveClientId(activity);
                  if (cid) {
                    navigate(`/admin/clients/${cid}`);
                    return;
                  }
                  navigate('/admin/audit');
                };
                return (
                  <div
                    key={activity.id}
                    className="recentActivityRow"
                    tabIndex={0}
                    role="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 8px',
                      borderBottom:
                        i === recentActivity.length - 1 ? 'none' : '1px solid var(--divider-subtle)',
                      cursor: 'pointer',
                    }}
                    aria-label="Open related client or route detail"
                    onClick={openRelatedDetail}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openRelatedDetail();
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 500 }}>{activity.actor}</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>performed</span>{' '}
                      <span style={{ color: 'var(--accent-primary)' }}>{activity.action}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>: </span>
                      <span>{formatAuditSummary(activity, nameById)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
                      {formatDateTime(activity.ts)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <div style={sectionFooterLinks}>
          {auditSeeMore ? (
            <Link to="/admin/audit" style={sectionFooterLink}>
              See more
            </Link>
          ) : null}
          <Link to="/admin/audit" style={sectionFooterLink}>
            View Audit Logs
          </Link>
        </div>
      </section>

      <section>
        <h3 style={{ marginBottom: 4 }}>Recent Access Logs</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Last 7 days</p>
        <Card style={{ marginTop: 0, ...listCardScroll }}>
          {isLoading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : accessPreviewFailed ? (
            <div style={{ color: 'var(--text-secondary)' }}>
              Could not load this preview (request failed). Open Access Logs to retry.
            </div>
          ) : recentAccess.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)' }}>No proxied traffic in the last 7 days.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentAccess.map((ev, i) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 8px',
                    borderBottom: i === recentAccess.length - 1 ? 'none' : '1px solid var(--divider-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#93c5fd',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 500 }}>{ev.outcome}</span>
                    <span style={{ color: 'var(--text-secondary)' }}> · </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {ev.host}
                      {ev.path}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {formatDateTime(ev.ts)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div style={sectionFooterLinks}>
          {accessSeeMore ? (
            <Link to="/admin/access" style={sectionFooterLink}>
              See more
            </Link>
          ) : null}
          <Link to="/admin/access" style={sectionFooterLink}>
            View Access Logs
          </Link>
        </div>
      </section>
    </div>
  );
};
