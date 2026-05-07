import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import styles from './Drawer.module.css';

const TRANSITION_MS = 280;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  ariaLabel: string;
  /** For `aria-controls` on the menu toggle */
  panelId: string;
  children: React.ReactNode;
};

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, side, ariaLabel, panelId, children }) => {
  const location = useLocation();
  const [shouldRender, setShouldRender] = useState(false);
  const [animOpen, setAnimOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setShouldRender(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimOpen(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setAnimOpen(false);
    closeTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);
      closeTimeoutRef.current = null;
    }, TRANSITION_MS);
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

  const prevPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevPathRef.current !== null && prevPathRef.current !== location.pathname) {
      onClose();
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const trapTab = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    []
  );

  useEffect(() => {
    if (!shouldRender || !animOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const toFocus = focusables[0] ?? closeBtnRef.current;
    toFocus?.focus();

    document.addEventListener('keydown', trapTab);
    return () => {
      document.removeEventListener('keydown', trapTab);
      previouslyFocusedRef.current?.focus?.();
      previouslyFocusedRef.current = null;
    };
  }, [shouldRender, animOpen, trapTab]);

  if (!shouldRender || typeof document === 'undefined') {
    return null;
  }

  const onBackdropClick = () => onClose();

  return createPortal(
    <div className={clsx(styles.root, animOpen && styles.rootOpen)} role="presentation">
      <div
        className={clsx(styles.backdrop, animOpen && styles.backdropOpen)}
        aria-hidden
        onClick={onBackdropClick}
      />
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${panelId}-title`}
        tabIndex={-1}
        className={clsx(
          styles.panel,
          side === 'left' ? styles.panelLeft : styles.panelRight,
          animOpen && styles.panelOpen
        )}
      >
        <div className={styles.header}>
          <h2 id={`${panelId}-title`} className={styles.title}>
            {ariaLabel}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={22} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  );
};
