import { useEffect, useMemo, useState } from 'react';
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
import {
  fetchUnreadMessageActivityIds,
  fetchUnreadStatusActivityIds,
} from '../services/internalNotificationService';
import {
  getActivityTime,
  hasActivityStarted,
  isActivityArchived,
  isActivityInPostEventGrace,
} from '../utils/activityLifecycle';

type View = 'creadas' | 'unidas' | 'solicitadas' | 'meGustan';

const VIEW_LABELS: Record<View, string> = {
  unidas: 'Me he unido',
  solicitadas: 'Solicitadas',
  meGustan: 'Guardadas',
  creadas: 'Creadas por mí',
};

export default function MyActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [requestedActivities, setRequestedActivities] = useState<Activity[]>([]);
  const [savedActivities, setSavedActivities] = useState<Activity[]>([]);
  const [savedActivityIds, setSavedActivityIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [unreadMessageActivityIds, setUnreadMessageActivityIds] = useState<Set<string>>(new Set());
  const [unreadStatusActivityIds, setUnreadStatusActivityIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>('unidas');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let isFirstLoad = true;

    async function loadPageData() {
      try {
        const [activitiesData, requestedData, userData, savedData] = await Promise.all([
          fetchActivities({ estado: 'todas', sort: 'fechaAsc', limit: 120 }),
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

  const { proximasActivities, recentFinishedActivities, historyActivities } = useMemo(() => {
    const ahora = Date.now();

    return {
      proximasActivities: [...visibleActivities]
        .filter((activity) => !hasActivityStarted(activity, ahora))
        .sort((a, b) => getActivityTime(a) - getActivityTime(b)),
      recentFinishedActivities: [...visibleActivities]
        .filter((activity) => isActivityInPostEventGrace(activity, ahora))
        .sort((a, b) => getActivityTime(b) - getActivityTime(a)),
      historyActivities: [...visibleActivities]
        .filter((activity) => isActivityArchived(activity, ahora))
        .sort((a, b) => getActivityTime(b) - getActivityTime(a)),
    };
  }, [visibleActivities]);
  const pasadasActivities = recentFinishedActivities;

  useEffect(() => {
    if (!currentUserId || chatActivities.length === 0) {
      setUnreadMessageActivityIds(new Set());
      setUnreadStatusActivityIds(new Set());
      return;
    }

    let isMounted = true;
    const visibleChatActivityIds = new Set(chatActivities.map((activity) => activity._id));

    async function loadUnreadMessages() {
      try {
        const [activityIds, statusActivityIds] = await Promise.all([
          fetchUnreadMessageActivityIds(),
          fetchUnreadStatusActivityIds(),
        ]);
        if (isMounted) {
          setUnreadMessageActivityIds(new Set(activityIds.filter((id) => visibleChatActivityIds.has(id))));
          setUnreadStatusActivityIds(new Set(statusActivityIds.filter((id) => visibleChatActivityIds.has(id))));
        }
      } catch {
        if (isMounted) {
          setUnreadMessageActivityIds(new Set());
          setUnreadStatusActivityIds(new Set());
        }
      }
    }

    loadUnreadMessages();
    const intervalId = window.setInterval(loadUnreadMessages, 5000);
    window.addEventListener('planes:messages-changed', loadUnreadMessages);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('planes:messages-changed', loadUnreadMessages);
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
    meGustan: 'No tienes actividades guardadas todavia.',
  };

  return (
    <main className="page page--activities">
      <header>
        <div>
          <h1>Mis actividades</h1>
          <p>Planes que has creado, solicitado, guardado o a los que te has unido.</p>
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
              <div className="section-heading__title">
                <h2>{VIEW_LABELS[view]}</h2>
                <span className="section-heading__badge">{proximasActivities.length + recentFinishedActivities.length}</span>
              </div>
            </div>
          </>
        )}
        {!isLoading && !error && visibleActivities.length === 0 && (
          <p>{emptyMessages[view]}</p>
        )}
        {!isLoading && !error && visibleActivities.length > 0 && (() => {
          const renderCard = (activity: Activity, isFinished = false) => {
            const hasCreatorUpdates = Boolean(
              currentUserId &&
              isActivityCreator(activity, currentUserId) &&
              unreadStatusActivityIds.has(activity._id),
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
                zonaPrincipal={activity.zonaPrincipal}
                estado={isFinished ? 'finalizada' : activity.estado}
                date={activity.fecha}
                spots={activity.plazas}
                occupiedSpots={activity.plazasOcupadas}
                availableSpots={activity.plazasDisponibles}
                imagenUrl={activity.imagenUrl}
                participants={getActivityParticipantsCount(activity, currentUserId)}
                isJoined={Boolean(currentUserId && isUserInActivity(activity, currentUserId))}
                isCreator={Boolean(currentUserId && isActivityCreator(activity, currentUserId))}
                requestStatus={isFinished ? undefined : requestStatus}
                hasActivityUpdates={!isFinished && hasCreatorUpdates}
                hasUnreadMessages={unreadMessageActivityIds.has(activity._id)}
                leftUsersCount={0}
                isSaved={savedActivityIds.has(activity._id)}
                privateChatUserId={!isFinished && requestStatus && currentUserId ? currentUserId : undefined}
                onToggleSave={!isFinished && currentUserId ? () => handleToggleSave(activity._id) : undefined}
                compact
              />
            );
          };
          return (
            <>
              {proximasActivities.length > 0 && (
                <>
                  <p className="activities-group__label">Proximas</p>
                  <div className="activity-grid activity-grid--compact">
                    {proximasActivities.map((activity) => renderCard(activity))}
                  </div>
                </>
              )}
              {pasadasActivities.length > 0 && (
                <>
                  <p className="activities-group__label">Finalizadas recientemente</p>
                  <div className="activity-grid activity-grid--compact activity-grid--finished">
                    {pasadasActivities.map((activity) => renderCard(activity, true))}
                  </div>
                </>
              )}
              {proximasActivities.length === 0 && pasadasActivities.length === 0 && (
                <p>{emptyMessages[view]}</p>
              )}
            </>
          );
        })()}
      </section>
    </main>
  );
}
