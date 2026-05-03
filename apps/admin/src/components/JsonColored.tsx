import React from 'react';
import clsx from 'clsx';
import styles from './JsonColored.module.css';

function indent(n: number): string {
  return '  '.repeat(n);
}

function punct(s: string): React.ReactNode {
  return <span className={styles.punct}>{s}</span>;
}

function renderValue(v: unknown, depth: number): React.ReactNode {
  if (v === null) {
    return <span className={styles.null}>null</span>;
  }
  if (typeof v === 'boolean') {
    return <span className={styles.bool}>{v ? 'true' : 'false'}</span>;
  }
  if (typeof v === 'number') {
    return <span className={styles.number}>{String(v)}</span>;
  }
  if (typeof v === 'string') {
    return <span className={styles.string}>{JSON.stringify(v)}</span>;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) {
      return <>{punct('[]')}</>;
    }
    return (
      <>
        {punct('[')}
        {'\n'}
        {v.map((item, i) => (
          <React.Fragment key={i}>
            {indent(depth + 1)}
            {renderValue(item, depth + 1)}
            {i < v.length - 1 ? punct(',') : null}
            {'\n'}
          </React.Fragment>
        ))}
        {indent(depth)}
        {punct(']')}
      </>
    );
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 0) {
      return <>{punct('{}')}</>;
    }
    return (
      <>
        {punct('{')}
        {'\n'}
        {keys.map((k, i) => (
          <React.Fragment key={k}>
            {indent(depth + 1)}
            <span className={styles.key}>{JSON.stringify(k)}</span>
            {punct(': ')}
            {renderValue(o[k], depth + 1)}
            {i < keys.length - 1 ? punct(',') : null}
            {'\n'}
          </React.Fragment>
        ))}
        {indent(depth)}
        {punct('}')}
      </>
    );
  }
  return <span className={styles.string}>{JSON.stringify(v)}</span>;
}

type JsonColoredProps = {
  value: unknown;
  className?: string;
};

/** Pretty-printed JSON with basic syntax colors (no external highlighter). */
export const JsonColored: React.FC<JsonColoredProps> = ({ value, className }) => {
  return <pre className={clsx(styles.root, className)}>{renderValue(value, 0)}</pre>;
};
