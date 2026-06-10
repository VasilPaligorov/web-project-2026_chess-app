import styles from './ReplayControls.module.css';

interface Props {
  plyIndex: number;
  lastPly: number;
  onJumpToStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpToEnd: () => void;
  onClose: () => void;
}

export function ReplayControls({
  plyIndex,
  lastPly,
  onJumpToStart,
  onPrev,
  onNext,
  onJumpToEnd,
  onClose,
}: Props) {
  const atStart = plyIndex === 0;
  const atEnd = plyIndex === lastPly;

  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.ctrlBtn}
        onClick={onJumpToStart}
        disabled={atStart}
        aria-label="Jump to start"
      >
        ⏮
      </button>
      <button
        type="button"
        className={styles.ctrlBtn}
        onClick={onPrev}
        disabled={atStart}
        aria-label="Previous move"
      >
        ◀
      </button>
      <span className={`${styles.plyLabel} tnum`}>
        {plyIndex} / {lastPly}
      </span>
      <button
        type="button"
        className={styles.ctrlBtn}
        onClick={onNext}
        disabled={atEnd}
        aria-label="Next move"
      >
        ▶
      </button>
      <button
        type="button"
        className={styles.ctrlBtn}
        onClick={onJumpToEnd}
        disabled={atEnd}
        aria-label="Jump to end"
      >
        ⏭
      </button>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close replay"
      >
        Close
      </button>
    </div>
  );
}
