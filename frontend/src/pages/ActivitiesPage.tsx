import { useEffect, useState } from 'react';
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

const CATEGORIES = [
  'Deporte y aire libre',
  'Ocio y social',
  'Conocer gente',
  'Gastronomía',
  'Cultura',
  'Aficiones',
  'Viajes y escapadas',
  'Formación',
  'Familia',
  'Voluntariado',
  'Otros',
];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [unreadMessageActivityIds, setUnreadMessageActivityIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
          setError('No se pudieron cargar las actividades');
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
  const filteredActivities = selectedCategory
    ? activities.filter((a) => a.categoria === selectedCategory)
    : activities;

  useEffect(() => {
    if (!currentUserId || activities.length === 0) {
      setUnreadMessageActivityIds(new Set());
      return;
    }

    let isMounted = true;
    const joinedActivities = activities.filter((activity) => isUserInActivity(activity, currentUserId));

    async function loadUnreadMessages() {
      const activityIds = await Promise.all(
        joinedActivities.map(async (activity) => {
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
  }, [activities, currentUserId]);

  return (
    <main className="page page--activities">
      <header>
        <div>
          <h1>Actividades</h1>
          <p>Explora las actividades disponibles y unete a las que mas te interesen.</p>
        </div>
        <div className="page-actions">
          <Link className="button button--secondary" to="/my-activities">Mis actividades</Link>
          <Link className="button button--primary" to="/activities/new">Crear actividad</Link>
        </div>
      </header>
      <section className="activities-stack">
        {isLoading && <p>Cargando actividades...</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && (
          <>
            <div className="category-filter">
              <button
                className={`category-filter__chip${selectedCategory === null ? ' category-filter__chip--active' : ''}`}
                type="button"
                onClick={() => setSelectedCategory(null)}
              >
                Todas
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`category-filter__chip${selectedCategory === cat ? ' category-filter__chip--active' : ''}`}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="section-heading">
              <h2>{selectedCategory ?? 'Todas las actividades'}</h2>
              <span className="section-heading__badge">{filteredActivities.length}</span>
            </div>
          </>
        )}
        {!isLoading && !error && filteredActivities.length === 0 && (
          <p>No hay actividades{selectedCategory ? ` en "${selectedCategory}"` : ' todavia'}.</p>
        )}
        <div className="activity-grid">
          {filteredActivities.map((activity) => (
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
