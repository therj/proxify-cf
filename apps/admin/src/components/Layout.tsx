import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Route,
  KeyRound,
  Link2,
  ScrollText,
  Activity,
} from 'lucide-react';
import { AdminApiRetryProvider } from '../context/AdminApiRetryContext';
import { AppHeader } from './AppHeader';
import styles from './Layout.module.css';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/admin/clients', label: 'Clients', icon: Users },
  { path: '/admin/routes', label: 'Routes', icon: Route },
  { path: '/admin/keys', label: 'Keys & Tokens', icon: KeyRound },
  { path: '/admin/grants', label: 'Grants', icon: Link2 },
  { path: '/admin/access', label: 'Access logs', icon: ScrollText },
  { path: '/admin/audit', label: 'Audit Log', icon: Activity },
];

export const Layout: React.FC = () => {
  return (
    <div className={styles.shell}>
      <AppHeader />
      <div className={styles.bodyInner}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav} aria-label="Admin console">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className={styles.main} data-scroll-root="admin">
          <AdminApiRetryProvider>
            <Outlet />
          </AdminApiRetryProvider>
        </main>
      </div>
    </div>
  );
};
