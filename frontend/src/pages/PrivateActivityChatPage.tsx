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
  markPrivateActivityConversationInactive,
  PrivateActivityMessage,
  sendPrivateActivityMessage,
} from '../services/privateActivityChatService';
import { markPrivateMessagesReadByActivityAndActor } from '../services/internalNotificationService';
import { markPrivateChatSeen } from '../services/notificationService';
import { getSocket } from '../services/socketService';
import { isActivityArchived } from '../utils/activityLifecycle';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    if (response?.status === 403) return 'No tienes permiso para ver esta conversacion';
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo completar la accion';
  }

  return 'No se pudo completar la accion';
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
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
  const creatorId = activity ? getReferenceId(activity.creador) : null;
  const isCreator = Boolean(activity && currentUserId && isActivityCreator(activity, currentUserId));
  const chatPeerId = isCreator ? conversationUserId : creatorId;
  const isArchived = Boolean(activity && isActivityArchived(activity));
  const canWriteChat = !isArchived;

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
          const peerId = isActivityCreator(activityData, viewerId ?? '')
            ? conversationUserId
            : getReferenceId(activityData.creador);
          if (peerId) {
            markPrivateChatSeen(currentActivityId, peerId, viewerId);
            markPrivateMessagesReadByActivityAndActor(currentActivityId, peerId).catch(() => {});
          }
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
    if (!currentActivityId || !chatPeerId) return;
    markPrivateMessagesReadByActivityAndActor(currentActivityId, chatPeerId).catch(() => {});
    window.dispatchEvent(new Event('planes:messages-changed'));
  }, [currentActivityId, chatPeerId]);

  useEffect(() => {
    if (!currentActivityId || !chatPeerId || !canWriteChat) return;
    const peerId = chatPeerId;

    let isMounted = true;

    async function markActive() {
      try {
        await markPrivateActivityConversationActive(currentActivityId, peerId);
      } catch {
        if (!isMounted) return;
      }
    }

    markActive();
    const intervalId = window.setInterval(markActive, 8000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      markPrivateActivityConversationInactive(currentActivityId, peerId).catch(() => {});
    };
  }, [currentActivityId, chatPeerId, canWriteChat]);

  // WebSocket: private chat real-time
  useEffect(() => {
    if (!currentActivityId || !chatPeerId || !canWriteChat) return;
    const peerId = chatPeerId;

    const socket = getSocket();

    function belongsToCurrentConversation(message: PrivateActivityMessage) {
      const senderId = getReferenceId(message.sender);
      const receiverId = getReferenceId(message.receiver);
      return (
        message.activity === currentActivityId &&
        Boolean(currentUserId) &&
        ((senderId === currentUserId && receiverId === peerId) ||
          (senderId === peerId && receiverId === currentUserId))
      );
    }

    function onNewPrivateMessage(message: PrivateActivityMessage) {
      if (!belongsToCurrentConversation(message)) return;
      if (seenIds.current.has(message._id)) return;
      seenIds.current.add(message._id);
      setMessages((prev) => [...prev, message]);
      markPrivateChatSeen(currentActivityId, peerId, currentUserId);
      markPrivateMessagesReadByActivityAndActor(currentActivityId, peerId).catch(() => {});
      window.dispatchEvent(new Event('planes:messages-changed'));
    }

    function joinRoom() {
      socket.emit('joinPrivateChat', { activityId: currentActivityId, otherUserId: peerId });
    }

    if (socket.connected) joinRoom();
    else socket.once('connect', joinRoom);

    socket.on('newPrivateMessage', onNewPrivateMessage);
    socket.on('connect', joinRoom);

    return () => {
      socket.emit('leavePrivateChat', { activityId: currentActivityId, otherUserId: peerId });
      markPrivateActivityConversationInactive(currentActivityId, peerId).catch(() => {});
      socket.off('newPrivateMessage', onNewPrivateMessage);
      socket.off('connect', joinRoom);
    };
  }, [currentActivityId, chatPeerId, currentUserId, canWriteChat]);

  useEffect(() => {
    const messagesBox = messagesBoxRef.current;
    if (!messagesBox) return;
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }, [messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText || !currentActivityId || !conversationUserId || !canWriteChat) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const socket = getSocket();
      let message: PrivateActivityMessage | null = null;

      if (socket.connected) {
        message = await new Promise<PrivateActivityMessage | null>((resolve, reject) => {
          socket.emit(
            'sendPrivateMessage',
            { activityId: currentActivityId, text: trimmedText, receiverId: isCreator ? conversationUserId : undefined },
            (response: { ok?: boolean; error?: string; message?: PrivateActivityMessage }) => {
              if (response?.error) reject(new Error(response.error));
              else resolve(response.message ?? null);
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
      }
      if (message && !seenIds.current.has(message._id)) {
        const sentMessage = message;
        seenIds.current.add(sentMessage._id);
        setMessages((current) => [...current, sentMessage]);
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
          {messages.map((message, index) => {
            const isOwn = Boolean(currentUserId && getReferenceId(message.sender) === currentUserId);
            const senderId = getReferenceId(message.sender);
            const previousSenderId = index > 0 ? getReferenceId(messages[index - 1].sender) : null;
            const showAuthor = !isOwn && senderId !== previousSenderId;
            return (
              <div
                key={message._id}
                className={`message-bubble ${isOwn ? 'message-bubble--own' : 'message-bubble--other'}${showAuthor ? '' : ' message-bubble--stacked'}`}
              >
                {showAuthor && <span className="message-bubble__author">{getReferenceName(message.sender)}</span>}
                <p className="message-bubble__text">{message.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {canWriteChat ? (
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
            {isSubmitting ? '...' : <SendIcon />}
          </button>
        </form>
      ) : (
        <div className="message-input message-input--readonly">
          <p>Chat cerrado: la actividad ya esta archivada.</p>
        </div>
      )}
    </main>
  );
}
