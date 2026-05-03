import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

type Props = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = red confirm button */
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * In-app confirmation instead of `window.confirm()` so styling matches the admin UI.
 */
export const ConfirmDialog: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title={title}
    footer={
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} type="button" onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    }
  >
    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
      {message}
    </p>
  </Modal>
);
