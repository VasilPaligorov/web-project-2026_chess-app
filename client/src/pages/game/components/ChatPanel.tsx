import { useEffect, useRef, useState } from 'react';
import type { ChatMessagePayload } from '../../../../../shared/types';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  messages: ChatMessagePayload[];
  currentUserId: string;
  disabled: boolean;
  onSend: (text: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({ messages, currentUserId, disabled, onSend }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || disabled) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className={styles.panel}>
      <p className={styles.heading}>Chat</p>

      <div className={styles.messageList}>
        {messages.length === 0 && (
          <p className={styles.empty}>No messages yet.</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.userId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`${styles.message} ${isOwn ? styles.messageOwn : styles.messageOpponent}`}
            >
              <span className={`${styles.username} ${isOwn ? styles.usernameOwn : ''}`}>
                {msg.username}
              </span>
              <span className={styles.text}>{msg.text}</span>
              <span className={styles.time}>{formatTime(msg.createdAt)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="text"
          placeholder={disabled ? 'Waiting for opponent…' : 'Say something…'}
          value={input}
          disabled={disabled}
          maxLength={200}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={disabled || !input.trim()}
        >
          ⬆
        </button>
      </div>
    </div>
  );
}
