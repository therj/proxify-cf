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

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

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
              className={styles.modal}
              style={{ maxWidth: width || 500 }}
            >
              <div className={styles.header}>
                <h3 className={styles.title}>{title}</h3>
                <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              {error && <div className={styles.errorBanner}>{error}</div>}
              <div className={styles.content}>{children}</div>
              {footer && <div className={styles.footer}>{footer}</div>}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
