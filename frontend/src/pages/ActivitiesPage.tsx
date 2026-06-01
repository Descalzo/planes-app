import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ActivityCard from '../components/ActivityCard';
import {
  Activity,
  ActivitySort,
  ActivityStatusFilter,
  fetchActivities,
  getActivityParticipantsCount,
  isActivityCreator,
  isUserRemovedFromActivity,
  isUserInActivity,
} from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { fetchMessages } from '../services/messageService';
import { hasActivityUpdates, hasUnreadMessages } from '../services/notificationService';
import { CATEGORIES } from '../utils/activityImages';

const STATUS_OPTIONS: { value: ActivityStatusFilter; label: string }[] = [
  { value: 'futuras', label: 'Proximas' },
  { value: 'pasadas', label: 'Pasadas' },
  { value: 'todas', label: 'Todas' },
];

const SORT_OPTIONS: { value: ActivitySort; label: string }[] = [
  { value: 'fechaAsc', label: 'Mas cercanas en fecha' },
  { value: 'createdDesc', label: 'Ultimas creadas' },
  { value: 'createdAsc', label: 'Mas antiguas creadas' },
];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [unreadMessageActivityIds, setUnreadMessageActivityIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ActivityStatusFilter>('futuras');
  const [sort, setSort] = useState<ActivitySort>('fechaAsc');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let isFirstLoad = true;

    async function loadPageData() {
      try {
        const [activitiesData, userData] = await Promise.all([
          fetchActivities({
            categoria: selectedCategory,
            ciudad: cityFilter.trim(),
            estado: statusFilter,
            sort,
          }),
          fetchCurrentUser(),
        ]);
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
  }, [selectedCategory, cityFilter, statusFilter, sort]);

  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;
  const sectionTitle = selectedCategory || cityFilter.trim()
    ? 'Resultados filtrados'
    : statusFilter === 'pasadas'
      ? 'Actividades pasadas'
      : statusFilter === 'todas'
        ? 'Todas las actividades'
        : 'Proximas actividades';
  const emptyMessage = selectedCategory || cityFilter.trim()
    ? 'No hay actividades que coincidan con los filtros seleccionados.'
    : statusFilter === 'pasadas'
      ? 'No hay actividades pasadas.'
      : 'No hay actividades proximas todavia.';
  const activeFiltersCount = [selectedCategory, cityFilter.trim(), statusFilter !== 'futuras' ? statusFilter : '', sort !== 'fechaAsc' ? sort : '']
    .filter(Boolean).length;

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
            <div className="section-heading">
              <div className="section-heading__title">
                <h2>{sectionTitle}</h2>
                <span className="section-heading__badge">{activities.length}</span>
              </div>
              <button
                className="button button--ghost button--small"
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                aria-expanded={showFilters}
              >
                Filtros{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
              </button>
            </div>
            {showFilters && (
              <div className="activity-filters">
                <label>
                  Categoria
                  <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                    <option value="">Todas</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Ciudad
                  <input
                    type="search"
                    value={cityFilter}
                    onChange={(event) => setCityFilter(event.target.value)}
                    placeholder="Ej. Madrid"
                  />
                </label>
                <label>
                  Estado
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as ActivityStatusFilter)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Ordenar por
                  <select value={sort} onChange={(event) => setSort(event.target.value as ActivitySort)}>
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </>
        )}
        {!isLoading && !error && activities.length === 0 && (
          <p>{emptyMessage}</p>
        )}
        <div className="activity-grid">
          {activities.map((activity) => {
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
                occupiedSpots={activity.plazasOcupadas}
                availableSpots={activity.plazasDisponibles}
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
