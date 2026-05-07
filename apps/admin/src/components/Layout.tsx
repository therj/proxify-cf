import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  Route,
  KeyRound,
  Link2,
  ScrollText,
  Activity,
  Menu,
} from 'lucide-react';
import { AdminApiRetryProvider } from '../context/AdminApiRetryContext';
import { AppHeader } from './AppHeader';
import { Drawer } from './ui/Drawer';
import styles from './Layout.module.css';

const ADMIN_NAV_DRAWER_ID = 'admin-nav-drawer';

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
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  const sidebarNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navItem} ${styles.active}` : styles.navItem;

  const drawerNavClass = ({ isActive }: { isActive: boolean }) =>
    clsx(styles.navItem, styles.navItemDrawer, isActive && styles.active);

  return (
    <div className={styles.shell}>
      <AppHeader />
      <div className={styles.bodyInner}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav} aria-label="Admin console">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.end} className={sidebarNavClass}>
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className={styles.mobileToolbar}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Open admin menu"
            aria-expanded={isAdminMenuOpen}
            aria-controls={ADMIN_NAV_DRAWER_ID}
            onClick={() => setIsAdminMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <main className={styles.main} data-scroll-root="admin">
          <AdminApiRetryProvider>
            <Outlet />
          </AdminApiRetryProvider>
        </main>
      </div>

      <Drawer
        isOpen={isAdminMenuOpen}
        onClose={() => setIsAdminMenuOpen(false)}
        side="left"
        ariaLabel="Admin navigation"
        panelId={ADMIN_NAV_DRAWER_ID}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={drawerNavClass}
            onClick={() => setIsAdminMenuOpen(false)}
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </Drawer>
    </div>
  );
};
