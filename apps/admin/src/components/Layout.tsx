import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, Route, KeyRound, Link2, Activity } from 'lucide-react';
import styles from './Layout.module.css';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/admin/clients', label: 'Clients', icon: Users },
  { path: '/admin/routes', label: 'Routes', icon: Route },
  { path: '/admin/keys', label: 'Keys & Tokens', icon: KeyRound },
  { path: '/admin/grants', label: 'Grants', icon: Link2 },
  { path: '/admin/audit', label: 'Audit Log', icon: Activity },
];

export const Layout: React.FC = () => {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Shield className={styles.logoIcon} size={28} />
          <span>ProxifyAdmin</span>
        </div>
        <nav className={styles.nav}>
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
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};
