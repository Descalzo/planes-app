import { useEffect, useRef, useState } from 'react';
import { fetchMessages, Message, MessageAuthor } from '../services/messageService';
import { markChatSeen } from '../services/notificationService';

interface MessageListProps {
  activityId: string;
  currentUserId?: string | null;
  // When provided by parent (WebSocket mode), MessageList is purely a display component
  messages?: Message[];
  // Legacy polling mode: bump this to force a reload
  refreshKey?: number;
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

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    if (response?.status === 401) return 'Debes iniciar sesion para ver este chat';
    if (response?.status === 403) return 'Solo el organizador y los participantes aceptados pueden acceder al chat general';
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudieron cargar los mensajes';
  }
  return 'No se pudieron cargar los mensajes';
}

export default function MessageList({ activityId, currentUserId, messages: externalMessages, refreshKey }: MessageListProps) {
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(!externalMessages);
  const [error, setError] = useState<string | null>(null);
  const messagesBoxRef = useRef<HTMLElement | null>(null);

  const controlled = externalMessages !== undefined;
  const messages = controlled ? externalMessages : internalMessages;

  // Self-fetch only in polling (uncontrolled) mode
  useEffect(() => {
    if (controlled) return;
    if (!activityId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function loadMessages(showLoading = false) {
      if (showLoading) setIsLoading(true);
      try {
        const data = await fetchMessages(activityId);
        if (isMounted) {
          setInternalMessages(data);
          markChatSeen(activityId, currentUserId, data);
          setError(null);
        }
      } catch (caughtError) {
        if (isMounted) setError(getErrorMessage(caughtError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadMessages(true);
    const intervalId = window.setInterval(() => loadMessages(), 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activityId, currentUserId, refreshKey, controlled]);

  // In controlled (WebSocket) mode, keep markChatSeen in sync so the
  // "Mensajes nuevos" badge clears after visiting the chat.
  useEffect(() => {
    if (!controlled || !messages.length) return;
    markChatSeen(activityId, currentUserId, messages);
  }, [controlled, messages, activityId, currentUserId]);

  useEffect(() => {
    const messagesBox = messagesBoxRef.current;
    if (!messagesBox) return;
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }, [messages.length]);

  return (
    <section className="message-list" ref={messagesBoxRef}>
      <h2>Mensajes</h2>
      {isLoading && <p>Cargando mensajes...</p>}
      {error && <p role="alert">{error}</p>}
      {!isLoading && !error && messages.length === 0 && <p>Sin mensajes todavia.</p>}
      <div className="message-list__box">
        {messages.map((message, index) => {
          const isOwn = Boolean(currentUserId && getAuthorId(message) === currentUserId);
          const authorId = getAuthorId(message);
          const previousAuthorId = index > 0 ? getAuthorId(messages[index - 1]) : null;
          const showAuthor = !isOwn && authorId !== previousAuthorId;
          return (
            <div
              key={message._id}
              className={`message-bubble ${isOwn ? 'message-bubble--own' : 'message-bubble--other'}${showAuthor ? '' : ' message-bubble--stacked'}`}
            >
              {showAuthor && <span className="message-bubble__author">{getAuthorName(message)}</span>}
              <p className="message-bubble__text">{message.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
