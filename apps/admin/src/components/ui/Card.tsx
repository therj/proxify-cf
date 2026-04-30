import React from 'react';
import clsx from 'clsx';
import { motion, HTMLMotionProps } from 'framer-motion';
import styles from './Card.module.css';

interface CardProps extends HTMLMotionProps<'div'> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('glass', styles.card, className)} 
      {...props}
    >
      {children}
    </motion.div>
  );
};
