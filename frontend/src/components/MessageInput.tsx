import { FormEvent, useState } from 'react';
import { createMessage } from '../services/messageService';

interface MessageInputProps {
  activityId: string;
  onSent: () => void;
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    if (response?.status === 401) {
      return 'Debes iniciar sesion para enviar mensajes';
    }
    if (response?.status === 403) {
      return 'No tienes permiso para escribir en este chat';
    }

    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo enviar el mensaje';
  }

  return 'No se pudo enviar el mensaje';
}

export default function MessageInput({ activityId, onSent }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText || !activityId) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await createMessage(activityId, { text: trimmedText });
      setText('');
      onSent();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <textarea
        value={text}
        placeholder="Escribe un mensaje..."
        onChange={(event) => setText(event.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <button className="button button--primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  );
}
