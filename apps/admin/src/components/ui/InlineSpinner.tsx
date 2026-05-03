import React from 'react';
import clsx from 'clsx';
import styles from './InlineSpinner.module.css';

type Props = {
  size?: 'sm' | 'md';
  className?: string;
  /** Accessible label (defaults to "Loading") */
  label?: string;
};

export function InlineSpinner({ size = 'md', className, label = 'Loading' }: Props) {
  return (
    <span
      className={clsx(styles.root, size === 'sm' ? styles.sm : styles.md, className)}
      role="status"
      aria-label={label}
    />
  );
}
