import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  fetchActivity,
  getReferenceId,
  getReferenceName,
  isActivityCreator,
} from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import {
  fetchPrivateActivityMessages,
  markPrivateActivityConversationActive,
  PrivateActivityMessage,
  sendPrivateActivityMessage,
} from '../services/privateActivityChatService';
import { markMessagesReadByActivity } from '../services/internalNotificationService';
import { markPrivateChatSeen } from '../services/notificationService';
import { getSocket } from '../services/socketService';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    if (response?.status === 403) return 'No tienes permiso para ver esta conversacion';
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo completar la accion';
  }

  return 'No se pudo completar la accion';
}

export default function PrivateActivityChatPage() {
  const { activityId, userId } = useParams();
  const navigate = useNavigate();
  const messagesBoxRef = useRef<HTMLElement | null>(null);
  const seenIds = useRef(new Set<string>());
  const [activity, setActivity] = useState<Activity | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [messages, setMessages] = useState<PrivateActivityMessage[]>([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentActivityId = activityId ?? '';
  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;
  const conversationUserId = userId ?? currentUserId ?? '';
  const isCreator = Boolean(activity && currentUserId && isActivityCreator(activity, currentUserId));

  useEffect(() => {
    if (!currentActivityId || !conversationUserId) {
      return;
    }

    let isMounted = true;

    async function loadData(showLoading = false) {
      if (showLoading) setIsLoading(true);

      try {
        const [activityData, userData, messagesData] = await Promise.all([
          fetchActivity(currentActivityId),
          fetchCurrentUser(),
          fetchPrivateActivityMessages(currentActivityId, conversationUserId),
        ]);
        if (isMounted) {
          setActivity(activityData);
          setCurrentUser(userData);
          messagesData.forEach((m) => seenIds.current.add(m._id));
          setMessages(messagesData);
          const viewerId = userData._id ?? userData.id ?? null;
          markPrivateChatSeen(currentActivityId, conversationUserId, viewerId);
          setError(null);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData(true);
    const intervalId = window.setInterval(() => loadData(), 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentActivityId, conversationUserId]);

  useEffect(() => {
    if (!currentActivityId) return;
    markMessagesReadByActivity(currentActivityId).catch(() => {});
    window.dispatchEvent(new Event('planes:messages-changed'));
  }, [currentActivityId]);

  useEffect(() => {
    if (!currentActivityId || !conversationUserId) return;

    let isMounted = true;

    async function markActive() {
      try {
        await markPrivateActivityConversationActive(currentActivityId, conversationUserId);
      } catch {
        if (!isMounted) return;
      }
    }

    markActive();
    const intervalId = window.setInterval(markActive, 8000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentActivityId, conversationUserId]);

  // WebSocket: private chat real-time
  useEffect(() => {
    if (!currentActivityId || !conversationUserId) return;

    const socket = getSocket();

    function onNewPrivateMessage(message: PrivateActivityMessage) {
      if (seenIds.current.has(message._id)) return;
      seenIds.current.add(message._id);
      setMessages((prev) => [...prev, message]);
    }

    function joinRoom() {
      socket.emit('joinPrivateChat', { activityId: currentActivityId, otherUserId: conversationUserId });
    }

    if (socket.connected) joinRoom();
    else socket.once('connect', joinRoom);

    socket.on('newPrivateMessage', onNewPrivateMessage);
    socket.on('connect', joinRoom);

    return () => {
      socket.emit('leavePrivateChat', { activityId: currentActivityId, otherUserId: conversationUserId });
      socket.off('newPrivateMessage', onNewPrivateMessage);
      socket.off('connect', joinRoom);
    };
  }, [currentActivityId, conversationUserId]);

  useEffect(() => {
    const messagesBox = messagesBoxRef.current;
    if (!messagesBox) return;
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }, [messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText || !currentActivityId || !conversationUserId) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const socket = getSocket();
      let message: PrivateActivityMessage;

      if (socket.connected) {
        message = await new Promise<PrivateActivityMessage>((resolve, reject) => {
          socket.emit(
            'sendPrivateMessage',
            { activityId: currentActivityId, text: trimmedText, receiverId: isCreator ? conversationUserId : undefined },
            (response: { ok?: boolean; error?: string }) => {
              if (response?.error) reject(new Error(response.error));
              else resolve(null as unknown as PrivateActivityMessage);
            },
          );
        });
        // Message will arrive via newPrivateMessage WS event — no manual push needed
      } else {
        message = await sendPrivateActivityMessage(
          currentActivityId,
          trimmedText,
          isCreator ? conversationUserId : undefined,
        );
        if (message && !seenIds.current.has(message._id)) {
          seenIds.current.add(message._id);
          setMessages((current) => [...current, message]);
        }
      }
      setText('');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = isCreator
    ? `Consulta con ${messages.find((message) => getReferenceId(message.sender) === conversationUserId || getReferenceId(message.receiver) === conversationUserId)
        ? getReferenceName(messages.find((message) => getReferenceId(message.sender) === conversationUserId)?.sender ?? messages.find((message) => getReferenceId(message.receiver) === conversationUserId)?.receiver)
        : 'usuario'}`
    : 'Pregunta al organizador';

  return (
    <main className="page page--chat">
      <header>
        <button
          className="button button--ghost button--small"
          type="button"
          onClick={() => navigate(`/activities/${activityId}`)}
        >
          Volver a la actividad
        </button>
        <h1>{title}</h1>
      </header>

      <section className="message-list" ref={messagesBoxRef}>
        {isLoading && <p>Cargando conversacion...</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && messages.length === 0 && (
          <p>Sin mensajes todavia.</p>
        )}
        <div className="message-list__box">
          {messages.map((message) => {
            const isOwn = Boolean(currentUserId && getReferenceId(message.sender) === currentUserId);
            return (
              <div
                key={message._id}
                className={`message-bubble ${isOwn ? 'message-bubble--own' : 'message-bubble--other'}`}
              >
                {!isOwn && <span className="message-bubble__author">{getReferenceName(message.sender)}</span>}
                <p className="message-bubble__text">{message.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <form className="message-input" onSubmit={handleSubmit}>
        <div className="message-input__body">
          <textarea
            value={text}
            placeholder="Escribe un mensaje privado..."
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <button
          className="button button--primary message-input__send"
          type="submit"
          disabled={isSubmitting}
          aria-label={isSubmitting ? 'Enviando' : 'Enviar mensaje'}
        >
          {isSubmitting ? '...' : 'Enviar'}
        </button>
      </form>
    </main>
  );
}
