import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  InternalNotification,
  markMessagesReadByActivity,
  markNotificationAsRead,
} from '../services/internalNotificationService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { markChatSeenNow, markPrivateChatSeen } from '../services/notificationService';

function getActivityId(notification: InternalNotification): string | null {
  if (!notification.activity) return null;
  if (typeof notification.activity === 'string') return notification.activity;
  return notification.activity._id ?? notification.activity.id ?? null;
}

function formatDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getChatPath(notification: InternalNotification, activityId: string, currentUserId: string | null): string {
  if (notification.type === 'private_activity_message') {
    const actorId = typeof notification.actor === 'object'
      ? notification.actor?._id ?? notification.actor?.id
      : notification.actor;
    if (actorId) {
      return `/activities/${activityId}/private-chat/${actorId}`;
    }
    return `/activities/${activityId}`;
  }
  return `/activities/${activityId}/chat`;
}

function isMessageNotification(notification: InternalNotification) {
  return notification.type === 'private_activity_message' || notification.type === 'general_chat_message';
}

function getActorId(notification: InternalNotification): string | null {
  if (!notification.actor) return null;
  if (typeof notification.actor === 'string') return notification.actor;
  return notification.actor._id ?? notification.actor.id ?? null;
}

function markMessageNotificationSeenLocally(
  notification: InternalNotification,
  activityId: string,
  currentUserId: string | null,
) {
  if (notification.type === 'private_activity_message') {
    const actorId = getActorId(notification);
    if (actorId) {
      markPrivateChatSeen(activityId, actorId, currentUserId);
    }
    return;
  }

  markChatSeenNow(activityId, currentUserId);
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [data, user] = await Promise.all([fetchNotifications(), fetchCurrentUser()]);
        if (isMounted) {
          setNotifications(data.filter(isMessageNotification).filter((n) => !n.readAt));
          setCurrentUser(user);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('No se pudieron cargar los mensajes');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    const intervalId = window.setInterval(load, 15000);
    window.addEventListener('planes:messages-changed', load);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('planes:messages-changed', load);
    };
  }, []);

  async function handleOpenChat(notification: InternalNotification) {
    const activityId = getActivityId(notification);
    if (!activityId) return;

    setMarkingId(notification._id);
    setError(null);

    try {
      await markMessagesReadByActivity(activityId);
      markMessageNotificationSeenLocally(notification, activityId, currentUserId);
      setNotifications((current) => current.filter((n) => n._id !== notification._id));
      window.dispatchEvent(new Event('planes:messages-changed'));
      navigate(getChatPath(notification, activityId, currentUserId));
    } catch {
      setError('No se pudo abrir el mensaje');
    } finally {
      setMarkingId(null);
    }
  }

  async function handleMarkAsRead(notification: InternalNotification) {
    const activityId = getActivityId(notification);

    setMarkingId(notification._id);
    setError(null);
    try {
      await markNotificationAsRead(notification._id);
      if (activityId) {
        markMessageNotificationSeenLocally(notification, activityId, currentUserId);
      }
      setNotifications((current) => current.filter((n) => n._id !== notification._id));
      window.dispatchEvent(new Event('planes:messages-changed'));
    } catch {
      setError('No se pudo marcar el mensaje como leido');
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <main className="page page--notifications">
      <header>
        <div>
          <h1>Mensajes</h1>
          <p>Chat general y mensajes privados de tus actividades.</p>
        </div>
      </header>

      <section className="notifications-list">
        {isLoading && <p>Cargando mensajes...</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && notifications.length === 0 && (
          <p>No tienes mensajes nuevos.</p>
        )}
        {notifications.map((notification) => {
          const activityId = getActivityId(notification);
          const isUnread = !notification.readAt;

          return (
            <article
              className={`notification-item${isUnread ? ' notification-item--unread' : ''}`}
              key={notification._id}
            >
              <div>
                <p>{notification.message}</p>
                {notification.createdAt && <span>{formatDate(notification.createdAt)}</span>}
              </div>
              <div className="notification-item__actions">
                {activityId && (
                  <button
                    className="button button--ghost button--small"
                    type="button"
                    disabled={markingId === notification._id}
                    onClick={() => handleOpenChat(notification)}
                  >
                    Ir al chat
                  </button>
                )}
                {isUnread && (
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    disabled={markingId === notification._id}
                    onClick={() => handleMarkAsRead(notification)}
                  >
                    {markingId === notification._id ? 'Guardando...' : 'Marcar leido'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
