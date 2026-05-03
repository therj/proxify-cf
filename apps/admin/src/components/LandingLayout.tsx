import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { LandingFooter } from './LandingFooter';
import styles from './LandingLayout.module.css';

export const LandingLayout: React.FC = () => {
  return (
    <div className={styles.shell}>
      <AppHeader />
      <main className={styles.main}>
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
};
