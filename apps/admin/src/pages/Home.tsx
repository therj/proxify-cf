import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Lock, ScrollText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import btnStyles from '../components/ui/Button.module.css';
import styles from './Home.module.css';

/** Full-width landing page — shared design tokens with the admin console. */
export const Home: React.FC = () => {
  return (
    <div className={styles.pageWrap}>
      <section className={styles.hero} id="overview">
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Edge control plane</p>
          <h1 className={styles.title}>Route traffic with confidence</h1>
          <p className={styles.lead}>
            Proxify CF is a Cloudflare Worker reverse proxy with D1-backed routing, JWT access, and an admin console.
            Configure hosts, upstreams, clients, keys, and grants from one place.
          </p>
          <div className={styles.ctaRow}>
            <Link className={`${btnStyles.button} ${btnStyles.primary} ${btnStyles.lg}`} to="/admin">
              Open admin console
            </Link>
            <Link className={`${btnStyles.button} ${btnStyles.secondary} ${btnStyles.lg}`} to="/docs">
              Read documentation
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.features} aria-labelledby="features-heading">
        <div className={styles.featuresInner}>
          <h2 id="features-heading" className={styles.sectionTitle}>
            Platform highlights
          </h2>
          <p className={styles.sectionSubtitle}>
            Built for operators who need visibility and safe change paths—not a black-box edge.
          </p>
          <div className={styles.grid}>
            <Card className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden>
                <Globe size={22} strokeWidth={2} />
              </div>
              <h3 className={styles.featureTitle}>Dynamic host &amp; path routing</h3>
              <p className={styles.featureBody}>
                Map incoming hosts and path prefixes to upstream URLs. Preserve query, method, and body behavior per route.
              </p>
            </Card>
            <Card className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden>
                <Lock size={22} strokeWidth={2} />
              </div>
              <h3 className={styles.featureTitle}>JWT &amp; grants</h3>
              <p className={styles.featureBody}>
                Issue server-side tokens or verify client-signed JWTs. Tie access to per-route grants for each client.
              </p>
            </Card>
            <Card className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden>
                <ScrollText size={22} strokeWidth={2} />
              </div>
              <h3 className={styles.featureTitle}>Audit trail</h3>
              <p className={styles.featureBody}>
                Administrative actions are logged so you can trace who changed routes, keys, clients, and grants.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
