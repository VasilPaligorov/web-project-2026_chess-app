import styles from './ResignConfirmModal.module.css';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation dialog before a player resigns. */
export function ResignConfirmModal({ onConfirm, onCancel }: Props) {
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Resign?</p>
          <button
            type="button"
            className={styles.close}
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className={styles.hint}>
          Your opponent will be awarded the win.
        </p>
        <div className={styles.actions}>
          <button className={styles.ghost} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.danger} onClick={onConfirm}>
            Resign
          </button>
        </div>
      </div>
    </div>
  );
}
