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

function shouldShowNotification(notification: InternalNotification) {
  return notification.type !== 'private_activity_message' && notification.type !== 'general_chat_message';
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
          setNotifications(data.filter(shouldShowNotification).filter((n) => !n.readAt));
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

  async function handleMarkAsRead(notification: InternalNotification) {
    const activityId = getActivityId(notification);

    setMarkingId(notification._id);
    setError(null);
    try {
      await markNotificationAsRead(notification._id);
      if (activityId) {
        markActivitySeen(activityId, currentUser?._id ?? currentUser?.id ?? null);
      }
      setNotifications((current) => current.filter((n) => n._id !== notification._id));
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
      setNotifications((current) => current.filter((n) => n._id !== notification._id));
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
        {isLoading && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ display: 'grid', gap: '0.5rem', padding: '1rem 1rem 1rem 1.35rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="skeleton" style={{ height: '0.875rem', width: '65%', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '0.75rem', width: '40%', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '2.1rem', width: '8rem', borderRadius: '999px', marginTop: '0.25rem' }} />
              </div>
            ))}
          </>
        )}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && notifications.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">🔔</div>
            <p className="empty-state__title">Todo al dia</p>
            <p className="empty-state__body">Cuando alguien solicite unirse a tu actividad o haya novedades, aparecera aqui.</p>
          </div>
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
                    onClick={() => handleMarkAsRead(notification)}
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
