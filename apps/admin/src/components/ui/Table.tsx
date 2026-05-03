import React from 'react';
import clsx from 'clsx';
import styles from './Table.module.css';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Renders inside the scroll wrapper above the table (e.g. filters) so controls are not tied to unrelated column widths. */
  toolbar?: React.ReactNode;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, toolbar, ...props }, ref) => (
    <div className={styles.wrapper}>
      {toolbar}
      <table ref={ref} className={clsx(styles.table, className)} {...props}>
        {children}
      </table>
    </div>
  )
);
Table.displayName = 'Table';

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <th className={clsx(styles.th, className)} {...props}>
    <span className={styles.thLabel}>{children}</span>
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => <td className={clsx(styles.td, className)} {...props} />;
