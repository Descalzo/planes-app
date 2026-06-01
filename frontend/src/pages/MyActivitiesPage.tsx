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

type View = 'todas' | 'creadas' | 'unidas';

const VIEW_LABELS: Record<View, string> = {
  todas:   'Todas',
  creadas: 'Creadas por mí',
  unidas:  'A las que me uní',
};

export default function MyActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [unreadMessageActivityIds, setUnreadMessageActivityIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>('todas');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let isFirstLoad = true;

    async function loadPageData() {
      try {
        const [activitiesData, userData] = await Promise.all([
          fetchActivities({ estado: 'todas', sort: 'fechaAsc' }),
          fetchCurrentUser(),
        ]);
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
      if (!isFirstLoad) loadPageData();
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
            (a) => isUserInActivity(a, currentUserId) || isUserRemovedFromActivity(a, currentUserId),
          )
        : [],
    [activities, currentUserId],
  );

  const visibleActivities = useMemo(() => {
    if (!currentUserId) return [];
    if (view === 'creadas') return myActivities.filter((a) => isActivityCreator(a, currentUserId));
    if (view === 'unidas')  return myActivities.filter((a) => !isActivityCreator(a, currentUserId));
    return myActivities;
  }, [myActivities, currentUserId, view]);

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

  const emptyMessages: Record<View, string> = {
    todas:   'No tienes actividades creadas ni a las que te hayas unido.',
    creadas: 'No has creado ninguna actividad todavia.',
    unidas:  'No te has unido a ninguna actividad todavia.',
  };

  return (
    <main className="page page--activities">
      <header>
        <div>
          <h1>Mis actividades</h1>
          <p>Planes que has creado o a los que te has unido.</p>
        </div>
        <div className="page-actions">
          <Link className="button button--secondary" to="/activities">Explorar</Link>
          <Link className="button button--primary" to="/activities/new">Crear actividad</Link>
        </div>
      </header>
      <section className="activities-stack">
        {isLoading && <p>Cargando tus actividades...</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && (
          <>
            <div className="category-filter">
              {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`category-filter__chip${view === v ? ' category-filter__chip--active' : ''}`}
                  onClick={() => setView(v)}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
            <div className="section-heading">
              <h2>{VIEW_LABELS[view]}</h2>
              <span className="section-heading__badge">{visibleActivities.length}</span>
            </div>
          </>
        )}
        {!isLoading && !error && visibleActivities.length === 0 && (
          <p>{emptyMessages[view]}</p>
        )}
        <div className="activity-grid">
          {visibleActivities.map((activity) => {
            const hasCreatorUpdates = Boolean(
              currentUserId &&
              isActivityCreator(activity, currentUserId) &&
              hasActivityUpdates(activity, currentUserId)
            );

            return (
              <ActivityCard
                key={activity._id}
                id={activity._id}
                title={activity.titulo}
                category={activity.categoria}
                city={activity.ciudad}
                date={activity.fecha}
                spots={activity.plazas}
                imagenUrl={activity.imagenUrl}
                participants={getActivityParticipantsCount(activity, currentUserId)}
                isJoined={Boolean(currentUserId && isUserInActivity(activity, currentUserId))}
                isCreator={Boolean(currentUserId && isActivityCreator(activity, currentUserId))}
                isRemoved={Boolean(currentUserId && isUserRemovedFromActivity(activity, currentUserId))}
                hasActivityUpdates={hasCreatorUpdates}
                hasUnreadMessages={unreadMessageActivityIds.has(activity._id)}
                leftUsersCount={hasCreatorUpdates ? activity.salidas?.length ?? 0 : 0}
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}
