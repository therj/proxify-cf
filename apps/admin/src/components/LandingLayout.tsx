import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { Shield, BookOpen, LayoutDashboard, Activity, Home } from 'lucide-react';
import { LandingFooter } from './LandingFooter';
import styles from './LandingLayout.module.css';

const navClass = ({ isActive }: { isActive: boolean }) =>
  clsx(styles.navLink, isActive && styles.navLinkActive);

export const LandingLayout: React.FC = () => {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <Shield className={styles.brandIcon} size={26} aria-hidden />
            <span>Proxify CF</span>
          </Link>
          <nav className={styles.nav} aria-label="Site">
            <NavLink to="/" end className={navClass}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Home size={16} aria-hidden />
                Home
              </span>
            </NavLink>
            <NavLink to="/docs" className={navClass}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={16} aria-hidden />
                Documentation
              </span>
            </NavLink>
            <NavLink to="/admin" className={navClass}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <LayoutDashboard size={16} aria-hidden />
                Admin panel
              </span>
            </NavLink>
            <a className={styles.navLink} href="/health">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Activity size={16} aria-hidden />
                Health
              </span>
            </a>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
};
