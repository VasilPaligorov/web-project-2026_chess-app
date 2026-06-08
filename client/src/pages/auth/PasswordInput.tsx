import { useState } from 'react';
import EyeIcon from '../../components/icons/EyeIcon';
import EyeOffIcon from '../../components/icons/EyeOffIcon';
import styles from './Auth.module.css';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
}

export default function PasswordInput({ value, onChange, autoComplete, minLength }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.passwordWrap}>
      <input
        className={styles.input}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className={styles.eye}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={-1}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
