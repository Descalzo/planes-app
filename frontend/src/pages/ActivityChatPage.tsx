import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MessageInput from '../components/MessageInput';
import MessageList from '../components/MessageList';
import { Activity, fetchActivity, isActivityCreator, isUserInActivity } from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { fetchMessages, Message, markGeneralChatActive } from '../services/messageService';
import { markMessagesReadByActivity } from '../services/internalNotificationService';
import { markChatSeen, markChatSeenNow } from '../services/notificationService';
import { getSocket } from '../services/socketService';

export default function ActivityChatPage() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const seenIds = useRef(new Set<string>());

  const currentActivityId = activityId ?? '';
  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;
  const canAccessChat = Boolean(
    activity &&
    currentUserId &&
    (isActivityCreator(activity, currentUserId) || isUserInActivity(activity, currentUserId)),
  );

  // Initial load: activity, user, messages via HTTP
  useEffect(() => {
    if (!currentActivityId) {
      setIsLoading(false);
      setError('Actividad no valida');
      return;
    }

    let isMounted = true;

    async function loadInitialData() {
      try {
        const [activityData, userData, messagesData] = await Promise.all([
          fetchActivity(currentActivityId),
          fetchCurrentUser(),
          fetchMessages(currentActivityId).catch(() => [] as Message[]),
        ]);
        if (isMounted) {
          setActivity(activityData);
          setCurrentUser(userData);
          messagesData.forEach((m) => seenIds.current.add(m._id));
          setMessages(messagesData);
          markChatSeen(currentActivityId, userData._id ?? userData.id ?? null, messagesData);
          setError(null);
        }
      } catch {
        if (isMounted) setError('No se pudo comprobar tu acceso al chat');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInitialData();
    return () => { isMounted = false; };
  }, [currentActivityId]);

  // Mark notifications as read + keep active ping (suppresses push notifications)
  useEffect(() => {
    if (!currentActivityId) return;
    markMessagesReadByActivity(currentActivityId).catch(() => {});
    markChatSeenNow(currentActivityId, currentUserId);
    window.dispatchEvent(new Event('planes:messages-changed'));

    let isMounted = true;
    async function pingActive() {
      try { await markGeneralChatActive(currentActivityId); } catch { if (!isMounted) return; }
    }
    pingActive();
    const intervalId = window.setInterval(pingActive, 8000);
    return () => { isMounted = false; window.clearInterval(intervalId); };
  }, [currentActivityId, currentUserId]);

  // WebSocket setup — runs after access is confirmed
  useEffect(() => {
    if (!currentActivityId || !canAccessChat) return;

    const socket = getSocket();

    function onNewMessage(message: Message) {
      if (seenIds.current.has(message._id)) return;
      seenIds.current.add(message._id);
      setMessages((prev) => [...prev, message]);
      markChatSeenNow(currentActivityId, currentUserId);
      markMessagesReadByActivity(currentActivityId).catch(() => {});
      window.dispatchEvent(new Event('planes:messages-changed'));
    }

    function joinRoom() {
      socket.emit('joinActivityChat', { activityId: currentActivityId });
      setSocketConnected(true);
    }

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once('connect', joinRoom);
    }

    socket.on('newActivityMessage', onNewMessage);
    socket.on('connect', joinRoom);
    socket.on('disconnect', () => setSocketConnected(false));

    return () => {
      socket.emit('leaveActivityChat', { activityId: currentActivityId });
      socket.off('newActivityMessage', onNewMessage);
      socket.off('connect', joinRoom);
      socket.off('disconnect');
      setSocketConnected(false);
    };
  }, [currentActivityId, canAccessChat, currentUserId]);

  async function handleSend(text: string) {
    const socket = getSocket();
    if (!socket.connected) throw new Error('Sin conexion. Intenta de nuevo.');
    return new Promise<void>((resolve, reject) => {
      socket.emit(
        'sendActivityMessage',
        { activityId: currentActivityId, text },
        (response: { ok?: boolean; error?: string }) => {
          if (response?.error) reject(new Error(response.error));
          else resolve();
        },
      );
    });
  }

  return (
    <main className="page page--chat">
      <header>
        <button
          className="button button--ghost button--small"
          onClick={() => navigate(`/activities/${activityId}`)}
        >
          Volver a la actividad
        </button>
        <h1>Chat de actividad</h1>
      </header>
      {isLoading && <section className="message-list"><p>Cargando chat...</p></section>}
      {!isLoading && error && <section className="message-list"><p role="alert">{error}</p></section>}
      {!isLoading && !error && !canAccessChat && (
        <section className="message-list">
          <p role="alert">Solo el organizador y los participantes aceptados pueden acceder al chat general.</p>
        </section>
      )}
      {!isLoading && !error && canAccessChat && (
        <>
          <MessageList
            activityId={currentActivityId}
            currentUserId={currentUserId}
            messages={messages}
          />
          <MessageInput
            activityId={currentActivityId}
            onSend={socketConnected ? handleSend : undefined}
          />
        </>
      )}
    </main>
  );
}
