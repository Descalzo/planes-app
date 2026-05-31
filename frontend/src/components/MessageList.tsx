import { useEffect, useRef, useState } from 'react';
import { fetchMessages, Message, MessageAuthor } from '../services/messageService';
import { markChatSeen } from '../services/notificationService';

interface MessageListProps {
  activityId: string;
  refreshKey: number;
  currentUserId?: string | null;
}

function getAuthorName(message: Message) {
  if (typeof message.author === 'object') {
    return message.author.nombre ?? 'Usuario';
  }
  return 'Usuario';
}

function getAuthorId(message: Message): string | null {
  if (typeof message.author === 'object' && message.author !== null) {
    return (message.author as MessageAuthor)._id ?? (message.author as MessageAuthor).id ?? null;
  }
  return typeof message.author === 'string' ? message.author : null;
}

export default function MessageList({ activityId, refreshKey, currentUserId }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesBoxRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!activityId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function loadMessages(showLoading = false) {
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const data = await fetchMessages(activityId);
        if (isMounted) {
          setMessages(data);
          markChatSeen(activityId, currentUserId, data);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('No se pudieron cargar los mensajes');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMessages(true);
    const intervalId = window.setInterval(() => loadMessages(), 3000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activityId, currentUserId, refreshKey]);

  useEffect(() => {
    const messagesBox = messagesBoxRef.current;
    if (!messagesBox) {
      return;
    }
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }, [messages.length]);

  return (
    <section className="message-list" ref={messagesBoxRef}>
      <h2>Mensajes</h2>
      {isLoading && <p>Cargando mensajes...</p>}
      {error && <p role="alert">{error}</p>}
      {!isLoading && !error && messages.length === 0 && <p>Sin mensajes todavia.</p>}
      <div className="message-list__box">
        {messages.map((message) => {
          const isOwn = Boolean(currentUserId && getAuthorId(message) === currentUserId);
          return (
            <div
              key={message._id}
              className={`message-bubble ${isOwn ? 'message-bubble--own' : 'message-bubble--other'}`}
            >
              {!isOwn && (
                <span className="message-bubble__author">{getAuthorName(message)}</span>
              )}
              <p className="message-bubble__text">{message.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
