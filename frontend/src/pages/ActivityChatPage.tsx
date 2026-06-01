import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MessageInput from '../components/MessageInput';
import MessageList from '../components/MessageList';
import { Activity, fetchActivity, isActivityCreator, isUserInActivity } from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { markGeneralChatActive } from '../services/messageService';
import { markMessagesReadByActivity } from '../services/internalNotificationService';

export default function ActivityChatPage() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentActivityId = activityId ?? '';
  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;
  const canAccessChat = Boolean(
    activity &&
    currentUserId &&
    (isActivityCreator(activity, currentUserId) || isUserInActivity(activity, currentUserId)),
  );

  useEffect(() => {
    if (!currentActivityId) {
      setIsLoading(false);
      setError('Actividad no valida');
      return;
    }

    let isMounted = true;

    async function loadChatAccess() {
      try {
        const [activityData, userData] = await Promise.all([fetchActivity(currentActivityId), fetchCurrentUser()]);
        if (isMounted) {
          setActivity(activityData);
          setCurrentUser(userData);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('No se pudo comprobar tu acceso al chat');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadChatAccess();

    return () => {
      isMounted = false;
    };
  }, [currentActivityId]);

  useEffect(() => {
    if (!currentActivityId) return;

    markMessagesReadByActivity(currentActivityId).catch(() => {});
    window.dispatchEvent(new Event('planes:messages-changed'));

    let isMounted = true;
    async function pingActive() {
      try {
        await markGeneralChatActive(currentActivityId);
      } catch {
        if (!isMounted) return;
      }
    }

    pingActive();
    const intervalId = window.setInterval(pingActive, 8000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentActivityId]);

  return (
    <main className="page page--chat">
      <header>
        <button 
          className="button button--ghost button--small" 
          onClick={() => navigate(`/activities/${activityId}`)}
        >
          ← Volver a la actividad
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
          <MessageList activityId={currentActivityId} currentUserId={currentUserId} refreshKey={refreshKey} />
          <MessageInput activityId={currentActivityId} onSent={() => setRefreshKey((value) => value + 1)} />
        </>
      )}
    </main>
  );
}
