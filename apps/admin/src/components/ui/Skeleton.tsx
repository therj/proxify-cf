import React from 'react';
import clsx from 'clsx';
import { Td } from './Table';
import styles from './Skeleton.module.css';

/** Shared min-height for table load/error swap (single colspan cell). */
export const STABLE_TABLE_BODY_MIN_HEIGHT = 'clamp(280px, 38vh, 440px)';

/** Dashboard preview cards: keep load / error / empty / data in a similar vertical band. */
export const DASHBOARD_PREVIEW_MIN_HEIGHT = 280;

type SkeletonProps = {
  className?: string;
  height?: number | string;
  width?: number | string;
  radius?: 'md' | 'pill';
  /** When set, exposes a polite status for screen readers */
  ariaLabel?: string;
};

export function Skeleton({
  className,
  height = 14,
  width = '100%',
  radius = 'md',
  ariaLabel,
}: SkeletonProps) {
  const h = typeof height === 'number' ? `${height}px` : height;
  const w = typeof width === 'number' ? `${width}px` : width;
  return (
    <span
      className={clsx(styles.bone, radius === 'pill' && styles.bonePill, className)}
      style={{ height: h, width: w, minWidth: w === '100%' ? 0 : undefined }}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'status' : undefined}
    />
  );
}

type TableSkeletonGridProps = {
  columns: number;
  rows?: number;
  /** Fr units per column (e.g. [13, 17, 8, 16, 14, 15, 9, 8]); length must match `columns` when provided. */
  columnFr?: number[];
};

/** Fake table grid inside one cell — use inside `TableBodyStableSlot` with the same min-height as errors. */
export function TableSkeletonGrid({ columns, rows = 8, columnFr }: TableSkeletonGridProps) {
  const fr =
    columnFr && columnFr.length === columns
      ? columnFr.map((n) => `${n}fr`).join(' ')
      : Array.from({ length: columns }, () => '1fr').join(' ');

  const widthsForCell = (ci: number, ri: number) => {
    const base = [0.92, 0.88, 0.55, 0.78, 0.72, 0.8, 0.45, 0.5, 0.68, 0.75];
    const idx = (ci + ri) % base.length;
    return `${(base[idx] * 100).toFixed(0)}%`;
  };

  const cells: React.ReactNode[] = [];
  for (let ri = 0; ri < rows; ri += 1) {
    for (let ci = 0; ci < columns; ci += 1) {
      const lastRow = ri === rows - 1;
      cells.push(
        <div
          key={`${ri}-${ci}`}
          className={styles.placeholderCell}
          style={{
            gridColumn: ci + 1,
            gridRow: ri + 1,
            borderBottom: lastRow ? 'none' : undefined,
          }}
        >
          <Skeleton height={14} width={widthsForCell(ci, ri)} radius="pill" />
        </div>
      );
    }
  }

  return (
    <div
      className={styles.tablePlaceholder}
      style={{ gridTemplateColumns: fr }}
      aria-busy="true"
      aria-label="Loading table"
    >
      {cells}
    </div>
  );
}

type ListRowSkeletonProps = {
  /** Show right “timestamp” bar */
  showMeta?: boolean;
};

export function ListRowSkeleton({ showMeta = true }: ListRowSkeletonProps) {
  return (
    <div className={styles.listRow}>
      <Skeleton className={styles.listDot} height={8} width={8} radius="pill" />
      <div className={styles.listMain}>
        <Skeleton height={14} width="72%" radius="pill" />
        <Skeleton height={12} width="55%" radius="pill" />
      </div>
      {showMeta ? (
        <div className={styles.listMeta}>
          <Skeleton height={12} width={56} radius="pill" />
        </div>
      ) : null}
    </div>
  );
}

type JsonBlockSkeletonProps = {
  lines?: number;
};

export function JsonBlockSkeleton({ lines = 10 }: JsonBlockSkeletonProps) {
  const widths = ['100%', '94%', '88%', '76%', '82%', '70%', '90%', '65%', '78%', '84%', '72%', '68%'];
  return (
    <div className={styles.jsonStack} aria-busy="true" aria-label="Loading content">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={14} width={widths[i % widths.length]} radius="md" />
      ))}
    </div>
  );
}

type TableBodyStableSlotProps = {
  colSpan: number;
  minHeight?: string;
  children: React.ReactNode;
};

/** One `<tr>` with a full-width cell and reserved height for loading ↔ error. */
export function TableBodyStableSlot({ colSpan, minHeight = STABLE_TABLE_BODY_MIN_HEIGHT, children }: TableBodyStableSlotProps) {
  return (
    <tr>
      <Td colSpan={colSpan} style={{ padding: 0, verticalAlign: 'top', borderBottom: 'none' }}>
        <div className={styles.stableSlot} style={{ minHeight }}>
          {children}
        </div>
      </Td>
    </tr>
  );
}
