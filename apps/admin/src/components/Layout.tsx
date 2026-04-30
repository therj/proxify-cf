import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, Route, KeyRound, Link2, Activity } from 'lucide-react';
import styles from './Layout.module.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/routes', label: 'Routes', icon: Route },
  { path: '/keys', label: 'Keys & Tokens', icon: KeyRound },
  { path: '/grants', label: 'Grants', icon: Link2 },
  { path: '/audit', label: 'Audit Log', icon: Activity },
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
