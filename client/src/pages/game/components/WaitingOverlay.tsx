import styles from './WaitingOverlay.module.css';

interface Props {
  onShare: () => void;
  onCancel: () => void;
}

export function WaitingOverlay({ onShare, onCancel }: Props) {
  return (
    <div className={styles.overlay}>
      <p className={styles.eyebrow}>Awaiting opponent</p>
      <p className={styles.headline}>The board is set.</p>
      <p className={styles.lede}>
        Share the spectator link, or wait for someone to take the seat.
      </p>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={onShare}>
          Share link
        </button>
        <button className={styles.secondary} onClick={onCancel}>
          Cancel game
        </button>
      </div>
    </div>
  );
}
