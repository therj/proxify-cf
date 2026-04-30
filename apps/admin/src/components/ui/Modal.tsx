import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  error?: string | null;
  width?: string | number;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, error, width }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.backdrop}
            onClick={onClose}
          />
          <div className={styles.wrapper}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`glass ${styles.modal}`}
              style={{ maxWidth: width || 500 }}
            >
              <div className={styles.header}>
                <h3 className={styles.title}>{title}</h3>
                <button className={styles.closeBtn} onClick={onClose}>
                  <X size={20} />
                </button>
              </div>
              {error && (
                <div style={{ padding: '12px 24px', background: 'rgba(255,50,50,0.1)', color: 'var(--accent-danger)', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {error}
                </div>
              )}
              <div className={styles.content}>
                {children}
              </div>
              {footer && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
