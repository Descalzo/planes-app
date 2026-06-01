import { FormEvent, useState } from 'react';
import { createMessage } from '../services/messageService';

interface MessageInputProps {
  activityId: string;
  // Legacy: HTTP send + notify parent
  onSent?: () => void;
  // WebSocket mode: parent handles the send
  onSend?: (text: string) => Promise<void>;
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    if (response?.status === 401) return 'Debes iniciar sesion para enviar mensajes';
    if (response?.status === 403) return 'No tienes permiso para escribir en este chat';
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo enviar el mensaje';
  }
  return 'No se pudo enviar el mensaje';
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default function MessageInput({ activityId, onSent, onSend }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText || !activityId) return;

    setError(null);
    setIsSubmitting(true);
    try {
      if (onSend) {
        await onSend(trimmedText);
      } else {
        await createMessage(activityId, { text: trimmedText });
        onSent?.();
      }
      setText('');
    } catch (caughtError) {
      setError(typeof caughtError === 'string' ? caughtError : getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <div className="message-input__body">
        <textarea
          value={text}
          placeholder="Escribe un mensaje..."
          onChange={(event) => setText(event.target.value)}
        />
        {error && <p role="alert">{error}</p>}
      </div>
      <button
        className="button button--primary message-input__send"
        type="submit"
        disabled={isSubmitting}
        aria-label={isSubmitting ? 'Enviando' : 'Enviar mensaje'}
      >
        {isSubmitting ? '···' : <SendIcon />}
      </button>
    </form>
  );
}
