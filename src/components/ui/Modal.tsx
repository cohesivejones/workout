import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
  /** Called when the user dismisses via backdrop click or Escape. */
  onClose: () => void;
  /** id of the element labelling the dialog (for aria-labelledby). */
  labelId?: string;
  role?: 'dialog' | 'alertdialog';
  children: React.ReactNode;
}

/**
 * Accessible modal shell: portals to <body>, dims the page, traps initial
 * focus, and closes on Escape / backdrop click. Rendering it opens it.
 */
export function Modal({ onClose, labelId, role = 'dialog', children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Move focus into the dialog (first focusable element).
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    // Backdrop: click-to-dismiss is a convenience; keyboard users dismiss with
    // Escape (handled above), so the backdrop itself is presentational.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role={role}
        aria-modal="true"
        aria-labelledby={labelId}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
