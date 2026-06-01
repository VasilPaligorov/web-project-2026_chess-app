import { useEffect, useRef, useState } from 'react';
import styles from './ShareModal.module.css';

interface Props {
  link: string;
  onClose: () => void;
}

export function ShareModal({ link, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  }, []);

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        setCopied(true);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Spectator link</p>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className={styles.hint}>
          Share this link with anyone who wants to watch the game.
        </p>
        <div className={styles.row}>
          <input
            className={styles.input}
            type="text"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
          />
          <button type="button" className={styles.copy} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
