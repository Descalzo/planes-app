import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ActivityCard from '../components/ActivityCard';
import {
  Activity,
  fetchActivities,
  getActivityParticipantsCount,
  isActivityCreator,
  isUserRemovedFromActivity,
  isUserInActivity,
} from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { fetchMessages } from '../services/messageService';
import { hasActivityUpdates, hasUnreadMessages } from '../services/notificationService';

export default function MyActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [unreadMessageActivityIds, setUnreadMessageActivityIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let isFirstLoad = true;

    async function loadPageData() {
      try {
        const [activitiesData, userData] = await Promise.all([fetchActivities(), fetchCurrentUser()]);
        if (isMounted) {
          setActivities(activitiesData);
          setCurrentUser(userData);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('No se pudieron cargar tus actividades');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
        isFirstLoad = false;
      }
    }

    loadPageData();
    const intervalId = window.setInterval(() => {
      if (!isFirstLoad) {
        loadPageData();
      }
    }, 8000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;
  const myActivities = useMemo(
    () =>
      currentUserId
        ? activities.filter(
            (activity) => isUserInActivity(activity, currentUserId) || isUserRemovedFromActivity(activity, currentUserId),
          )
        : [],
    [activities, currentUserId],
  );

  useEffect(() => {
    if (!currentUserId || myActivities.length === 0) {
      setUnreadMessageActivityIds(new Set());
      return;
    }

    let isMounted = true;

    async function loadUnreadMessages() {
      const activityIds = await Promise.all(
        myActivities.map(async (activity) => {
          try {
            const messages = await fetchMessages(activity._id);
            return hasUnreadMessages(activity._id, messages, currentUserId) ? activity._id : null;
          } catch {
            return null;
          }
        }),
      );
      if (isMounted) {
        setUnreadMessageActivityIds(new Set(activityIds.filter(Boolean) as string[]));
      }
    }

    loadUnreadMessages();
    const intervalId = window.setInterval(loadUnreadMessages, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [myActivities, currentUserId]);

  return (
    <main className="page page--activities">
      <header>
        <div>
          <h1>Mis actividades</h1>
          <p>Planes que has creado o a los que te has unido.</p>
        </div>
        <div className="page-actions">
          <Link className="button button--secondary" to="/activities">Ver actividades</Link>
          <Link className="button button--primary" to="/activities/new">Crear actividad</Link>
        </div>
      </header>
      <section className="activities-stack">
        {isLoading && <p>Cargando tus actividades...</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && (
          <div className="section-heading">
            <h2>Mis actividades</h2>
            <span className="section-heading__badge">{myActivities.length}</span>
          </div>
        )}
        {!isLoading && !error && myActivities.length === 0 && (
          <p>No tienes actividades creadas ni actividades a las que te hayas unido.</p>
        )}
        <div className="activity-grid">
          {myActivities.map((activity) => (
            <ActivityCard
              key={activity._id}
              id={activity._id}
              title={activity.titulo}
              category={activity.categoria}
              city={activity.ciudad}
              spots={activity.plazas}
              participants={getActivityParticipantsCount(activity, currentUserId)}
              isJoined={Boolean(currentUserId && isUserInActivity(activity, currentUserId))}
              isRemoved={Boolean(currentUserId && isUserRemovedFromActivity(activity, currentUserId))}
              hasActivityUpdates={Boolean(currentUserId && isActivityCreator(activity, currentUserId) && hasActivityUpdates(activity, currentUserId))}
              hasUnreadMessages={unreadMessageActivityIds.has(activity._id)}
              leftUsersCount={currentUserId && isActivityCreator(activity, currentUserId) ? activity.salidas?.length ?? 0 : 0}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
