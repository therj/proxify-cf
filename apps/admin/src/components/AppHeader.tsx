import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { BookOpen, LayoutDashboard, Activity, Home, Menu } from 'lucide-react';
import { SiteBrand } from './SiteBrand';
import { Drawer } from './ui/Drawer';
import styles from './AppHeader.module.css';

const SITE_NAV_DRAWER_ID = 'site-nav-drawer';

const siteNavItems = [
  { to: '/', end: true, label: 'Home', icon: Home },
  { to: '/docs', end: false, label: 'Documentation', icon: BookOpen },
  { to: '/admin', end: false, label: 'Admin panel', icon: LayoutDashboard },
  { to: '/health', end: true, label: 'Health', icon: Activity },
] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  clsx(styles.navLink, isActive && styles.navLinkActive);

const navClassDrawer = ({ isActive }: { isActive: boolean }) =>
  clsx(styles.navLink, styles.navLinkDrawer, isActive && styles.navLinkActive);

export const AppHeader: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.brandSlot}>
          <SiteBrand variant="header" />
        </div>
        <nav className={styles.nav} aria-label="Site">
          {siteNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              <span className={styles.navLinkInner}>
                <item.icon size={16} aria-hidden />
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Open site menu"
          aria-expanded={isMenuOpen}
          aria-controls={SITE_NAV_DRAWER_ID}
          onClick={() => setIsMenuOpen(true)}
        >
          <Menu size={22} strokeWidth={2} aria-hidden />
        </button>
        <div className={styles.headerSpacer} aria-hidden="true" />
      </div>

      <Drawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        side="right"
        ariaLabel="Site navigation"
        panelId={SITE_NAV_DRAWER_ID}
      >
        {siteNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={navClassDrawer}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className={styles.navLinkInner}>
              <item.icon size={18} aria-hidden />
              {item.label}
            </span>
          </NavLink>
        ))}
      </Drawer>
    </header>
  );
};
