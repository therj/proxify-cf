import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { Button } from './ui/Button';
import styles from './DataLoadError.module.css';

type Props = {
  message: string;
  onRetry: () => void | Promise<void>;
  /** Table / page body — larger card treatment */
  variant?: 'panel' | 'banner';
  /** Overrides default heading (use for filter strips: short label only; put details in `message`) */
  title?: string;
};

const DEFAULT_PANEL_TITLE = 'Load failed';
const DEFAULT_BANNER_TITLE = 'Filters';

export function DataLoadError({ message, onRetry, variant = 'panel', title }: Props) {
  const isBanner = variant === 'banner';
  const heading = title ?? (isBanner ? DEFAULT_BANNER_TITLE : DEFAULT_PANEL_TITLE);

  if (isBanner) {
    return (
      <div className={styles.banner} role="alert">
        <div className={styles.bannerIcon} aria-hidden>
          <WifiOff size={20} strokeWidth={2} />
        </div>
        <div className={styles.bannerBody}>
          <p className={styles.bannerTitle}>{heading}</p>
          <p className={styles.bannerMessage}>{message}</p>
        </div>
        <div className={styles.bannerActions}>
          <Button type="button" size="sm" onClick={() => void onRetry()}>
            Try again
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
        <p className={styles.bannerHint}>Reload if you need a full sign-in (Access).</p>
      </div>
    );
  }

  return (
    <motion.div
      className={styles.panelWrap}
      role="alert"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={clsx('glass', styles.panel)}>
        <div className={styles.iconWrap} aria-hidden>
          <WifiOff size={22} strokeWidth={2} />
        </div>
        <p className={styles.title}>{heading}</p>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <Button type="button" size="md" onClick={() => void onRetry()}>
            Try again
          </Button>
          <Button type="button" variant="secondary" size="md" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
        <p className={styles.hint}>Use reload for Access sign-in.</p>
      </div>
    </motion.div>
  );
}
