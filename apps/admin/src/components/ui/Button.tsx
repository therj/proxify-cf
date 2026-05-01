import React from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(styles.button, styles[variant], styles[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? <span className={styles.spinner} /> : children}
      </button>
    );
  }
);
Button.displayName = 'Button';
