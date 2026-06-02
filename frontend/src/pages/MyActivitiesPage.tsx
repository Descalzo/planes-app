import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ActivityCard from '../components/ActivityCard';
import {
  Activity,
  fetchActivities,
  fetchRequestedActivities,
  fetchSavedActivities,
  saveActivity,
  unsaveActivity,
  getActivityParticipantsCount,
  isActivityCreator,
  isUserInActivity,
  isUserPendingInActivity,
  isUserRejectedFromActivity,
} from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { fetchMessages } from '../services/messageService';
import { hasActivityUpdates, hasUnreadMessages } from '../services/notificationService';

type View = 'creadas' | 'unidas' | 'solicitadas' | 'meGustan';

const VIEW_LABELS: Record<View, string> = {
  creadas: 'Creadas por mi',
  unidas: 'Me he unido',
  solicitadas: 'Solicitadas',
  meGustan: 'Me gustan',
};

export default function MyActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [requestedActivities, setRequestedActivities] = useState<Activity[]>([]);
  const [savedActivities, setSavedActivities] = useState<Activity[]>([]);
  const [savedActivityIds, setSavedActivityIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [unreadMessageActivityIds, setUnreadMessageActivityIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>('creadas');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let isFirstLoad = true;

    async function loadPageData() {
      try {
        const [activitiesData, requestedData, userData, savedData] = await Promise.all([
          fetchActivities({ estado: 'todas', sort: 'fechaAsc' }),
          fetchRequestedActivities().catch(() => [] as Activity[]),
          fetchCurrentUser(),
          fetchSavedActivities().catch(() => [] as Activity[]),
        ]);
        if (isMounted) {
          setActivities(activitiesData);
          setRequestedActivities(requestedData);
          setCurrentUser(userData);
          setSavedActivities(savedData);
          setSavedActivityIds(new Set(savedData.map((a) => a._id)));
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

  const createdActivities = useMemo(
    () => (currentUserId ? activities.filter((a) => isActivityCreator(a, currentUserId)) : []),
    [activities, currentUserId],
  );

  const joinedActivities = useMemo(
    () =>
      currentUserId
        ? activities.filter((a) => isUserInActivity(a, currentUserId) && !isActivityCreator(a, currentUserId))
        : [],
    [activities, currentUserId],
  );

  const chatActivities = useMemo(
    () => [...createdActivities, ...joinedActivities],
    [createdActivities, joinedActivities],
  );

  const visibleActivities = useMemo(() => {
    if (!currentUserId) return [];
    if (view === 'creadas') return createdActivities;
    if (view === 'unidas') return joinedActivities;
    if (view === 'solicitadas') return requestedActivities;
    if (view === 'meGustan') return savedActivities;
    return createdActivities;
  }, [createdActivities, joinedActivities, requestedActivities, savedActivities, currentUserId, view]);

  useEffect(() => {
    if (!currentUserId || chatActivities.length === 0) {
      setUnreadMessageActivityIds(new Set());
      return;
    }

    let isMounted = true;

    async function loadUnreadMessages() {
      const activityIds = await Promise.all(
        chatActivities.map(async (activity) => {
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
  }, [chatActivities, currentUserId]);

  async function handleToggleSave(activityId: string) {
    const isSaved = savedActivityIds.has(activityId);
    setSavedActivityIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
    if (isSaved) {
      setSavedActivities((prev) => prev.filter((a) => a._id !== activityId));
    }
    try {
      if (isSaved) await unsaveActivity(activityId);
      else await saveActivity(activityId);
    } catch {
      setSavedActivityIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(activityId);
        else next.delete(activityId);
        return next;
      });
    }
  }

  const emptyMessages: Record<View, string> = {
    creadas: 'No has creado ninguna actividad todavia.',
    unidas: 'No te has unido a ninguna actividad todavia.',
    solicitadas: 'No tienes solicitudes pendientes ni rechazadas.',
    meGustan: 'No has marcado ninguna actividad como me gusta todavia.',
  };

  return (
    <main className="page page--activities">
      <header>
        <div>
          <h1>Mis actividades</h1>
          <p>Planes que has creado, solicitado, guardado o a los que te has unido.</p>
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
              hasActivityUpdates(activity, currentUserId),
            );
            const requestStatus =
              currentUserId && isUserPendingInActivity(activity, currentUserId)
                ? 'pending'
                : currentUserId && isUserRejectedFromActivity(activity, currentUserId)
                  ? 'rejected'
                  : undefined;

            return (
              <ActivityCard
                key={activity._id}
                id={activity._id}
                title={activity.titulo}
                category={activity.categoria}
                city={activity.ciudad}
                date={activity.fecha}
                spots={activity.plazas}
                occupiedSpots={activity.plazasOcupadas}
                availableSpots={activity.plazasDisponibles}
                imagenUrl={activity.imagenUrl}
                participants={getActivityParticipantsCount(activity, currentUserId)}
                isJoined={Boolean(currentUserId && isUserInActivity(activity, currentUserId))}
                isCreator={Boolean(currentUserId && isActivityCreator(activity, currentUserId))}
                requestStatus={requestStatus}
                hasActivityUpdates={hasCreatorUpdates}
                hasUnreadMessages={unreadMessageActivityIds.has(activity._id)}
                leftUsersCount={hasCreatorUpdates ? activity.salidas?.length ?? 0 : 0}
                isSaved={savedActivityIds.has(activity._id)}
                privateChatUserId={requestStatus && currentUserId ? currentUserId : undefined}
                onToggleSave={currentUserId ? () => handleToggleSave(activity._id) : undefined}
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}
