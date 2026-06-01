import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  InternalNotification,
  markNotificationAsRead,
} from '../services/internalNotificationService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { markActivitySeen } from '../services/notificationService';

function getActivityId(notification: InternalNotification) {
  if (!notification.activity || typeof notification.activity === 'string') {
    return typeof notification.activity === 'string' ? notification.activity : null;
  }

  return notification.activity._id ?? notification.activity.id ?? null;
}

function formatDate(value?: string) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        const [data, user] = await Promise.all([fetchNotifications(), fetchCurrentUser()]);
        if (isMounted) {
          setNotifications(data);
          setCurrentUser(user);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('No se pudieron cargar las notificaciones');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function handleMarkAsRead(notificationId: string) {
    setMarkingId(notificationId);
    setError(null);
    try {
      const updatedNotification = await markNotificationAsRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification._id === notificationId ? updatedNotification : notification,
        ),
      );
      window.dispatchEvent(new Event('planes:notifications-changed'));
    } catch {
      setError('No se pudo marcar la notificacion como leida');
    } finally {
      setMarkingId(null);
    }
  }

  async function handleOpenActivity(notification: InternalNotification, activityId: string) {
    setMarkingId(notification._id);
    setError(null);

    try {
      await markNotificationAsRead(notification._id);
      markActivitySeen(activityId, currentUser?._id ?? currentUser?.id ?? null);
      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      window.dispatchEvent(new Event('planes:notifications-changed'));
      navigate(`/activities/${activityId}`);
    } catch {
      setError('No se pudo abrir la notificacion');
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <main className="page page--notifications">
      <header>
        <div>
          <h1>Notificaciones</h1>
          <p>Avisos sobre solicitudes y cambios en tus actividades.</p>
        </div>
      </header>

      <section className="notifications-list">
        {isLoading && <p>Cargando notificaciones...</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && notifications.length === 0 && (
          <p>No tienes notificaciones todavia.</p>
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
                    onClick={() => handleOpenActivity(notification, activityId)}
                  >
                    Ver actividad
                  </button>
                )}
                {isUnread && (
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    disabled={markingId === notification._id}
                    onClick={() => handleMarkAsRead(notification._id)}
                  >
                    {markingId === notification._id ? 'Guardando...' : 'Marcar leida'}
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
