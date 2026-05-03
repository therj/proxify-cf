import React from 'react';
import { Td } from './Table';
import styles from './Skeleton.module.css';

type TableBodyStableSlotProps = {
  colSpan: number;
  children: React.ReactNode;
};

/** One `<tr>` with a full-width cell (e.g. loading spinner in a table). */
export function TableBodyStableSlot({ colSpan, children }: TableBodyStableSlotProps) {
  return (
    <tr>
      <Td colSpan={colSpan} style={{ padding: 0, verticalAlign: 'top', borderBottom: 'none' }}>
        <div className={styles.stableSlot}>{children}</div>
      </Td>
    </tr>
  );
}
