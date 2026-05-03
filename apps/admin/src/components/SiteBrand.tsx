import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import clsx from 'clsx';
import styles from './SiteBrand.module.css';

export type SiteBrandVariant = 'header' | 'footer';

export type SiteBrandProps = {
  variant?: SiteBrandVariant;
};

const ICON_SIZE: Record<SiteBrandVariant, number> = {
  header: 26,
  footer: 22,
};

export const SiteBrand: React.FC<SiteBrandProps> = ({ variant = 'header' }) => {
  const v = variant;
  return (
    <div className={clsx(styles.wrap, v === 'footer' && styles.wrap_footer)}>
      <Link to="/" className={clsx(styles.brand, styles[`brand_${v}`])}>
        <Shield className={styles.brandIcon} size={ICON_SIZE[v]} aria-hidden />
        <span>Proxify CF</span>
      </Link>
    </div>
  );
};
