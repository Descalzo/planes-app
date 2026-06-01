import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  fetchPrivateActivityConversations,
  PrivateActivityConversation,
} from '../services/privateActivityChatService';
import { Activity, fetchActivity, getReferenceId, getReferenceName, isActivityCreator } from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { markPrivateChatSeen } from '../services/notificationService';
import { markMessagesReadByActivity } from '../services/internalNotificationService';

function formatDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function getSenderId(conv: PrivateActivityConversation): string | null {
  const sender = conv.lastMessage.sender;
  if (typeof sender === 'object' && sender) {
    return (sender as any)._id ?? (sender as any).id ?? null;
  }
  return typeof sender === 'string' ? sender : null;
}

export default function PrivateConversationsPage() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [conversations, setConversations] = useState<PrivateActivityConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentActivityId = activityId ?? '';
  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;

  useEffect(() => {
    if (!currentActivityId) return;

    let isMounted = true;

    async function load() {
      try {
        const [activityData, userData, convData] = await Promise.all([
          fetchActivity(currentActivityId),
          fetchCurrentUser(),
          fetchPrivateActivityConversations(currentActivityId),
        ]);

        if (isMounted) {
          const viewerId = userData._id ?? userData.id ?? null;
          if (!isActivityCreator(activityData, viewerId ?? '')) {
            setError('Solo el organizador puede ver las consultas privadas');
            setIsLoading(false);
            return;
          }
          setActivity(activityData);
          setCurrentUser(userData);
          setConversations(convData);
          // Marca todas las notificaciones de mensaje privado como leídas
          markMessagesReadByActivity(currentActivityId).catch(() => {});
          window.dispatchEvent(new Event('planes:messages-changed'));
          setError(null);
        }
      } catch {
        if (isMounted) setError('No se pudieron cargar las consultas');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    const intervalId = window.setInterval(async () => {
      try {
        const convData = await fetchPrivateActivityConversations(currentActivityId);
        if (isMounted) setConversations(convData);
      } catch { /* silent */ }
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentActivityId]);

  return (
    <main className="page page--notifications">
      <header>
        <button
          className="button button--ghost button--small"
          type="button"
          onClick={() => navigate(`/activities/${activityId}`)}
        >
          Volver a la actividad
        </button>
        <div>
          <h1>Consultas privadas</h1>
          {activity && <p>{activity.titulo}</p>}
        </div>
      </header>

      <section className="notifications-list">
        {isLoading && <p>Cargando consultas...</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && conversations.length === 0 && (
          <p>No hay consultas privadas todavia.</p>
        )}
        {conversations.map((conv) => {
          const userId = getReferenceId(conv.user);
          if (!userId) return null;

          const senderId = getSenderId(conv);
          const isUnseen = senderId !== currentUserId;

          // Registrar que el organizador ha visto esta conversación
          if (currentUserId && isUnseen) {
            markPrivateChatSeen(currentActivityId, senderId ?? userId, currentUserId);
          }

          return (
            <article
              className={`notification-item${isUnseen ? ' notification-item--unread' : ''}`}
              key={userId}
            >
              <div>
                <strong>{getReferenceName(conv.user)}</strong>
                <p>{conv.lastMessage.text}</p>
                {(conv.lastMessage as any).createdAt && (
                  <span>{formatDate((conv.lastMessage as any).createdAt)}</span>
                )}
              </div>
              <div className="notification-item__actions">
                <Link
                  className="button button--ghost button--small"
                  to={`/activities/${activityId}/private-chat/${userId}`}
                >
                  {isUnseen ? 'Responder (nuevo)' : 'Ver conversacion'}
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
