import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Check, Copy } from 'lucide-react';
import { JsonColored } from '../components/JsonColored';
import { AdminPageTitle } from '../components/AdminPageTitle';
import styles from './Health.module.css';

const JSON_ENDPOINT = '/api/health';

type Check = { ok: true; latency_ms: number } | { ok: false; latency_ms: number; error: string };

type HealthPayload = {
  status: string;
  checks: { d1: Check; kv: Check };
};

function formatHttpLine(status: number, statusText: string): string {
  const phrase = statusText?.trim() || (status === 200 ? 'OK' : status === 503 ? 'Service Unavailable' : '');
  return phrase ? `${status} ${phrase}` : String(status);
}

export const Health: React.FC = () => {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [httpStatusText, setHttpStatusText] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => {
        setCopiedUrl((prev) => (prev === url ? null : prev));
      }, 1600);
    } catch {
      setCopiedUrl(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(JSON_ENDPOINT, { headers: { Accept: 'application/json' } });
        const json = (await res.json()) as HealthPayload;
        if (cancelled) return;
        setHttpStatus(res.status);
        setHttpStatusText(res.statusText ?? '');
        if (!json || typeof json !== 'object' || !('checks' in json)) {
          setErr('Unexpected response shape');
          return;
        }
        setData(json);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const sameOriginUrl = `${origin}${JSON_ENDPOINT}`;

  const httpLine =
    !loading && httpStatus != null ? formatHttpLine(httpStatus, httpStatusText) : loading ? '…' : '—';

  const statusOk = !loading && !err && data != null && httpStatus != null && httpStatus >= 200 && httpStatus < 300;
  const statusBad = !loading && (err != null || (httpStatus != null && (httpStatus < 200 || httpStatus >= 300)));

  return (
    <div className={styles.page}>
      <AdminPageTitle
        title="Health: D1 and KV"
        description={
          <p className={styles.lead}>
            Read-only checks against the worker’s D1 and KV bindings. No auth — use the GET URL in the bar for uptime
            tools or <span className={styles.mono}>curl</span>.
          </p>
        }
      />

      <div className={styles.apiBar} aria-label="HTTP status and API URL">
        <div
          className={`${styles.apiBarStatus} ${
            statusOk ? styles.apiBarStatusOk : statusBad ? styles.apiBarStatusBad : styles.apiBarStatusMuted
          }`}
        >
          {httpLine}
        </div>
        <div className={styles.apiBarCode}>
          <div className={styles.apiBarRow}>
            <span className={styles.apiBarRowText}>
              GET {sameOriginUrl}
            </span>
            <button
              type="button"
              className={clsx(styles.copyBtn, copiedUrl === sameOriginUrl && styles.copyBtnCopied)}
              aria-label={`Copy URL ${sameOriginUrl}`}
              onClick={() => void copyUrl(sameOriginUrl)}
            >
              {copiedUrl === sameOriginUrl ? <Check size={15} strokeWidth={2.25} aria-hidden /> : <Copy size={15} strokeWidth={2.25} aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      {loading && <p className={styles.muted}>Loading body…</p>}
      {err && <p className={styles.err}>{err}</p>}

      {!loading && !err && data && <JsonColored value={data} />}
    </div>
  );
};
