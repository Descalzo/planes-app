import { useEffect, useState } from 'react';
import { fetchMessages, Message } from '../services/messageService';

interface MessageListProps {
  activityId: string;
  refreshKey: number;
}

function getAuthorName(message: Message) {
  if (typeof message.author === 'object') {
    return message.author.nombre ?? 'Usuario';
  }

  return 'Usuario';
}

export default function MessageList({ activityId, refreshKey }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchMessages(activityId)
      .then((data) => {
        if (isMounted) {
          setMessages(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No se pudieron cargar los mensajes');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activityId, refreshKey]);

  return (
    <section className="message-list">
      <h2>Mensajes</h2>
      {isLoading && <p>Cargando mensajes...</p>}
      {error && <p role="alert">{error}</p>}
      {!isLoading && !error && messages.length === 0 && <p>No hay mensajes todavia.</p>}
      {messages.map((message) => (
        <div className="message-card" key={message._id}>
          <strong>{getAuthorName(message)}</strong>
          <p>{message.text}</p>
        </div>
      ))}
    </section>
  );
}
