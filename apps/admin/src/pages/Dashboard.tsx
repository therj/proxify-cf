import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Users, Route, Key, KeyRound, Activity } from 'lucide-react';
import { api } from '../lib/api';
import { AuditLog } from '@proxify-cf/shared';

export const Dashboard = () => {
  const [metrics, setMetrics] = useState([
    { label: 'Total Clients', value: '...', icon: Users, color: '#a5b4fc' },
    { label: 'Active Routes', value: '...', icon: Route, color: '#86efac' },
    { label: 'Signing keys', value: '...', icon: Key, color: '#c4b5fd' },
    { label: 'Issued JWTs', value: '...', icon: KeyRound, color: '#fca5a5' },
    { label: 'Audit events', value: '...', icon: Activity, color: '#fde047' },
  ]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
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
    const loadDashboard = async () => {
      const results = await Promise.allSettled([
        api.clients.list(),
        api.routes.list(),
        api.keys.list(),
        api.keys.listTokens(),
        api.audit.list(),
      ]);

      const clients = results[0].status === 'fulfilled' ? results[0].value : [];
      const routes = results[1].status === 'fulfilled' ? results[1].value : [];
      const signingKeys = results[2].status === 'fulfilled' ? results[2].value : [];
      const tokens = results[3].status === 'fulfilled' ? results[3].value : [];
      const audit = results[4].status === 'fulfilled' ? results[4].value : [];

      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Dashboard metric ${i} failed`, r.reason);
        }
      });

      setMetrics([
        { label: 'Total Clients', value: String(clients.length), icon: Users, color: '#a5b4fc' },
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
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: 24,
        marginBottom: 32
      }}>
        {metrics.map((m, i) => (
          <Card key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: `${m.color}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: m.color
              }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {recentActivity.map((activity, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: i === recentActivity.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>{activity.actor}</span> performed <span style={{ color: 'var(--accent-primary)' }}>{activity.action}</span> on <span style={{ fontFamily: 'monospace' }}>{formatTarget(activity.action, activity.target, activity.meta)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(activity.ts).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
