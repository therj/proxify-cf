import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Users, Route, Key, KeyRound, Activity } from 'lucide-react';
import { api } from '../lib/api';
import { AuditLog, Client } from '@proxify-cf/shared';
import { formatAuditSummary, effectiveClientId } from '../lib/auditDisplay';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState([
    { label: 'Total Clients', value: '...', icon: Users, color: '#a5b4fc' },
    { label: 'Active Routes', value: '...', icon: Route, color: '#86efac' },
    { label: 'Signing keys', value: '...', icon: Key, color: '#c4b5fd' },
    { label: 'Issued JWTs', value: '...', icon: KeyRound, color: '#fca5a5' },
    { label: 'Audit events', value: '...', icon: Activity, color: '#fde047' },
  ]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const nameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  useEffect(() => {
    const loadDashboard = async () => {
      const results = await Promise.allSettled([
        api.clients.list(),
        api.routes.list(),
        api.keys.list(),
        api.keys.listTokens(),
        api.audit.list({ limit: 100 }),
      ]);

      const clientsList = results[0].status === 'fulfilled' ? results[0].value : [];
      const routes = results[1].status === 'fulfilled' ? results[1].value : [];
      const signingKeys = results[2].status === 'fulfilled' ? results[2].value : [];
      const tokens = results[3].status === 'fulfilled' ? results[3].value : [];
      const audit = results[4].status === 'fulfilled' ? results[4].value : [];

      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Dashboard metric ${i} failed`, r.reason);
        }
      });

      setClients(clientsList);

      setMetrics([
        { label: 'Total Clients', value: String(clientsList.length), icon: Users, color: '#a5b4fc' },
        { label: 'Active Routes', value: String(routes.length), icon: Route, color: '#86efac' },
        { label: 'Signing keys', value: String(signingKeys.length), icon: Key, color: '#c4b5fd' },
        { label: 'Issued JWTs', value: String(tokens.length), icon: KeyRound, color: '#fca5a5' },
        { label: 'Audit events', value: String(audit.length), icon: Activity, color: '#fde047' },
      ]);

      setRecentActivity(audit.slice(0, 5));
      setIsLoading(false);
    };
    loadDashboard();
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Dashboard</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
          marginBottom: 32,
        }}
      >
        {metrics.map((m, i) => (
          <Card key={i}>
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
        ))}
      </div>

      <h3>Recent Activity</h3>
      <Card style={{ marginTop: 16 }}>
        {isLoading ? (
          <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
        ) : recentActivity.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)' }}>No recent activity.</div>
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
                  {new Date(activity.ts).toLocaleString()}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
