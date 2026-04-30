import React from 'react';
import clsx from 'clsx';
import styles from './Table.module.css';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => (
    <div className={styles.wrapper}>
      <table ref={ref} className={clsx(styles.table, className)} {...props}>
        {children}
      </table>
    </div>
  )
);
Table.displayName = 'Table';

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = (props) => (
  <th className={styles.th} {...props} />
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = (props) => (
  <td className={styles.td} {...props} />
);
