import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { BookOpen, LayoutDashboard, Activity, Home } from 'lucide-react';
import { SiteBrand } from './SiteBrand';
import styles from './AppHeader.module.css';

const navClass = ({ isActive }: { isActive: boolean }) =>
  clsx(styles.navLink, isActive && styles.navLinkActive);

export const AppHeader: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.brandSlot}>
          <SiteBrand variant="header" />
        </div>
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
          <NavLink to="/health" end className={navClass}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Activity size={16} aria-hidden />
              Health
            </span>
          </NavLink>
        </nav>
        <div className={styles.headerSpacer} aria-hidden="true" />
      </div>
    </header>
  );
};
