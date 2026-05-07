import React from 'react';
import { Info, Copy, Check } from 'lucide-react';
import {
  PUBLIC_DEMO_ORIGIN_ENABLED,
  PUBLIC_DEMO_ORIGIN_HOST,
  PUBLIC_DEMO_ORIGIN_HEADERS,
  PUBLIC_DEMO_RETENTION_HOURS
} from '../lib/publicDemoOrigin';
import styles from './DemoNotice.module.css';

export const DemoNotice: React.FC = () => {
  const isDemo = PUBLIC_DEMO_ORIGIN_ENABLED;
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  if (!isDemo) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className={styles.noticeWrapper}>
      <div className={styles.notice}>
        <div className={styles.header}>
          <Info size={16} className={styles.icon} />
          <span className={styles.title}>Public Demo Mode</span>
        </div>
        <p className={styles.description}>
          <span className={styles.warning}>
            All data older than {PUBLIC_DEMO_RETENTION_HOURS} hours is automatically deleted on this demo site.
          </span>
          <br />
          Use these values to test proxy requests against this deployment.
        </p>
        <div className={styles.grid}>
          <div className={styles.item}>
            <span className={styles.label}>Host</span>
            <div className={styles.valueRow}>
              <code>{PUBLIC_DEMO_ORIGIN_HOST}</code>
              <button
                onClick={() => copyToClipboard(PUBLIC_DEMO_ORIGIN_HOST, -1)}
                className={styles.copyBtn}
                title="Copy Host"
              >
                {copiedIndex === -1 ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          {PUBLIC_DEMO_ORIGIN_HEADERS.map((h, i) => (
            <div key={h.name} className={styles.item}>
              <span className={styles.label}>{h.name}</span>
              <div className={styles.valueRow}>
                <code>{h.value}</code>
                <button
                  onClick={() => copyToClipboard(h.value, i)}
                  className={styles.copyBtn}
                  title={`Copy ${h.name}`}
                >
                  {copiedIndex === i ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
