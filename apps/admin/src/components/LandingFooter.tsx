import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import styles from './LandingFooter.module.css';

/** Site chrome footer for marketing/docs routes — admin console keeps its own sidebar. */
export const LandingFooter: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div className={styles.colBrand}>
          <Link to="/" className={styles.brand}>
            <Shield className={styles.brandIcon} size={22} aria-hidden />
            <span>Proxify CF</span>
          </Link>
          <p className={styles.tagline}>
            Edge proxy control plane for Cloudflare Workers — routing, auth, and observability in one stack.
          </p>
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>Product</h3>
          <ul className={styles.linkList}>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/docs">Documentation</Link>
            </li>
            <li>
              <Link to="/admin">Admin console</Link>
            </li>
          </ul>
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>Developers</h3>
          <ul className={styles.linkList}>
            <li>
              <a href="/health">Health &amp; probes</a>
            </li>
            <li className={styles.apiBlock}>
              <span className={styles.mono}>REST API base</span>
              <code className={styles.inlineCode}>/admin/api/v1</code>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Proxify CF. All rights reserved.
        </p>
        <nav className={styles.bottomNav} aria-label="Legal">
          <span className={styles.note}>Deployed as a Cloudflare Worker — monitor routes and audit logs from the admin UI.</span>
        </nav>
      </div>
    </footer>
  );
};
