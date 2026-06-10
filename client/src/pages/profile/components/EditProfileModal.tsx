import { useState } from 'react';
import axios from 'axios';
import api from '../../../services/api';
import styles from './EditProfileModal.module.css';

interface Props {
  userId: string;
  currentUsername: string;
  onUsernameUpdated: (newUsername: string) => void;
  onClose: () => void;
}

interface ApiError {
  message?: string;
}

function extractMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}

export function EditProfileModal({ userId, currentUsername, onUsernameUpdated, onClose }: Props) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Edit profile</p>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <UsernameSection
          userId={userId}
          currentUsername={currentUsername}
          onUsernameUpdated={onUsernameUpdated}
        />

        <PasswordSection userId={userId} />
      </div>
    </div>
  );
}

interface UsernameSectionProps {
  userId: string;
  currentUsername: string;
  onUsernameUpdated: (newUsername: string) => void;
}

function UsernameSection({ userId, currentUsername, onUsernameUpdated }: UsernameSectionProps) {
  const [value, setValue] = useState(currentUsername);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const trimmed = value.trim();
  const dirty = trimmed !== currentUsername;
  const canSubmit = dirty && trimmed.length >= 3 && trimmed.length <= 32 && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const { data } = await api.patch<{ success: boolean; data: { username: string } }>(
        `/api/users/${userId}`,
        { username: trimmed },
      );
      if (data.success) {
        onUsernameUpdated(data.data.username);
        setSuccess(true);
      }
    } catch (err) {
      setError(extractMessage(err, 'Could not update username'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.section}>
      <p className={styles.sectionLabel}>Username</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
            setSuccess(false);
          }}
          minLength={3}
          maxLength={32}
          aria-label="Username"
        />
        <button type="submit" className={styles.primary} disabled={!canSubmit}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>Updated.</p>}
    </section>
  );
}

interface PasswordSectionProps {
  userId: string;
}

function PasswordSection({ userId }: PasswordSectionProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const newLongEnough = next.length >= 8;
  const matches = next === confirm;
  const canSubmit = current.length > 0 && newLongEnough && matches && !saving;

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const { data } = await api.patch<{ success: boolean }>(
        `/api/users/${userId}/password`,
        { currentPassword: current, newPassword: next },
      );
      if (data.success) {
        reset();
        setSuccess(true);
      }
    } catch (err) {
      setError(extractMessage(err, 'Could not update password'));
    } finally {
      setSaving(false);
    }
  };

  const mismatchHint = next.length > 0 && confirm.length > 0 && !matches;

  return (
    <section className={styles.section}>
      <p className={styles.sectionLabel}>Password</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="password"
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            setError(null);
            setSuccess(false);
          }}
          placeholder="Current password"
          autoComplete="current-password"
          aria-label="Current password"
        />
        <input
          className={styles.input}
          type="password"
          value={next}
          onChange={(e) => {
            setNext(e.target.value);
            setError(null);
            setSuccess(false);
          }}
          placeholder="New password (8+ characters)"
          autoComplete="new-password"
          aria-label="New password"
        />
        <input
          className={styles.input}
          type="password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setError(null);
            setSuccess(false);
          }}
          placeholder="Confirm new password"
          autoComplete="new-password"
          aria-label="Confirm new password"
        />
        <button type="submit" className={styles.primary} disabled={!canSubmit}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
      {mismatchHint && <p className={styles.hint}>New password and confirmation must match.</p>}
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>Password updated.</p>}
    </section>
  );
}
