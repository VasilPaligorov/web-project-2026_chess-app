import styles from './DrawOfferToast.module.css';

interface Props {
  opponentName: string;
  onAccept: () => void;
  onDecline: () => void;
}

/** Bottom-right toast that prompts the user to accept or decline a draw offer. */
export function DrawOfferToast({ opponentName, onAccept, onDecline }: Props) {
  return (
    <div className={styles.toast} role="dialog">
      <p className={styles.eyebrow}>Draw offered</p>
      <p className={styles.body}>{opponentName} offers a draw.</p>
      <div className={styles.actions}>
        <button className={styles.ghost} onClick={onDecline}>
          Decline
        </button>
        <button className={styles.primary} onClick={onAccept}>
          Accept
        </button>
      </div>
    </div>
  );
}
