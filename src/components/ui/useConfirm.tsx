import React, { useCallback, useId, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import styles from './ConfirmDialog.module.css';

interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** 'danger' renders a solid red confirm button for destructive actions. */
  variant?: 'primary' | 'danger';
}

interface AlertOptions {
  title?: string;
  message: React.ReactNode;
  okText?: string;
}

type Request =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'alert'; options: AlertOptions; resolve: () => void };

/**
 * Promise-based replacement for window.confirm / window.alert, rendered with
 * the app's polished <Modal>. Returns `confirm`, `alert`, and the `dialog`
 * node to render somewhere in the component's output.
 *
 *   const { confirm, alert, dialog } = useConfirm();
 *   if (await confirm({ message: 'Delete this?', variant: 'danger' })) { ... }
 *   return <div>...{dialog}</div>;
 */
export function useConfirm() {
  const [request, setRequest] = useState<Request | null>(null);
  const labelId = useId();

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setRequest({ kind: 'confirm', options, resolve })),
    []
  );

  const alert = useCallback(
    (options: AlertOptions) =>
      new Promise<void>((resolve) => setRequest({ kind: 'alert', options, resolve })),
    []
  );

  let dialog: React.ReactNode = null;
  if (request) {
    const finish = (confirmed: boolean) => {
      if (request.kind === 'confirm') request.resolve(confirmed);
      else request.resolve();
      setRequest(null);
    };
    const { title, message } = request.options;

    dialog = (
      <Modal onClose={() => finish(false)} labelId={title ? labelId : undefined} role="alertdialog">
        {title && (
          <h2 id={labelId} className={styles.title}>
            {title}
          </h2>
        )}
        <div className={styles.message}>{message}</div>
        <div className={styles.actions}>
          {request.kind === 'confirm' ? (
            <>
              <Button variant="secondary" onClick={() => finish(false)}>
                {request.options.cancelText ?? 'Cancel'}
              </Button>
              <Button
                variant={request.options.variant === 'danger' ? 'dangerSolid' : 'primary'}
                onClick={() => finish(true)}
              >
                {request.options.confirmText ?? 'Confirm'}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => finish(false)}>
              {request.options.okText ?? 'OK'}
            </Button>
          )}
        </div>
      </Modal>
    );
  }

  return { confirm, alert, dialog };
}

export default useConfirm;
