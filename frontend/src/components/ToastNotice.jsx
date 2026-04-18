import { useEffect, useState } from 'react';

export default function ToastNotice({ message = '', type = 'success', durationMs = 2000, onDone }) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const id = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, durationMs);
    return () => clearTimeout(id);
  }, [message, durationMs, onDone]);

  if (!message || !visible) return null;

  return (
    <div className={`toast-notice ${type === 'error' ? 'error' : 'success'}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
