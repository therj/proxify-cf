import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { PUBLIC_DEMO_ORIGIN } from '../lib/publicDemoOrigin';
import type { FatalApiErrorVariant } from '../lib/fatalApiError';
import styles from './BlockingApiErrorModal.module.css';

type Props = {
  open: boolean;
  title: string;
  message: string;
  variant: FatalApiErrorVariant;
  onTryAgain: () => void;
};

export function BlockingApiErrorModal({ open, title, message, variant, onTryAgain }: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.backdrop}
            aria-hidden
          />
          <div className={styles.wrapper} role="alertdialog" aria-modal="true" aria-labelledby="blocking-api-error-title">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className={styles.panel}
            >
              <h2 id="blocking-api-error-title" className={styles.title}>
                {title}
              </h2>
              <div className={styles.content}>
                {variant === 'session' ? (
                  <>
                    <p>
                      Sign-in might still be in progress (for example Cloudflare Access). <strong>Reload page</strong> runs a
                      full navigation; <strong>Try again</strong> only retries API calls.
                    </p>
                    <p className={styles.demoBlock}>
                      Demo:{' '}
                      <a className={styles.demoLink} href={PUBLIC_DEMO_ORIGIN} target="_blank" rel="noopener noreferrer">
                        {PUBLIC_DEMO_ORIGIN.replace(/^https:\/\//, '')}
                      </a>
                    </p>
                  </>
                ) : variant === 'server' ? (
                  <p>The server sent HTML or something that isn’t JSON. Try again or reload.</p>
                ) : (
                  <p>The request didn’t finish (network, DNS, or a proxy). Check your connection, then try again or reload.</p>
                )}
                {message.trim() ? <div className={styles.detail}>{message}</div> : null}
              </div>
              <div className={styles.actions}>
                <div className={styles.actionRow}>
                  <Button type="button" size="lg" onClick={onTryAgain}>
                    Try again
                  </Button>
                  <Button type="button" variant="secondary" size="lg" onClick={() => window.location.reload()}>
                    Reload page
                  </Button>
                </div>
                <p className={styles.reloadHint}>Reload helps complete Access sign-in.</p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
