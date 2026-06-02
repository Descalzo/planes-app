import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ActivityCard from '../components/ActivityCard';
import {
  Activity,
  ActivitySort,
  ActivityStatusFilter,
  fetchActivities,
  fetchSavedActivities,
  saveActivity,
  unsaveActivity,
  getActivityParticipantsCount,
  isActivityCreator,
  isActivitySavedByUser,
  isUserRemovedFromActivity,
  isUserInActivity,
} from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { fetchMessages } from '../services/messageService';
import { hasActivityUpdates, hasUnreadMessages } from '../services/notificationService';
import { CATEGORIES, CATEGORY_VISUALS } from '../utils/activityImages';
import { PROVINCIAS } from '../utils/provincias';

function SkeletonActivityCard() {
  return (
    <div className="activity-card">
      <div className="skeleton skeleton-card__image" />
      <div style={{ display: 'grid', gap: '0.5rem', padding: '0.85rem 1rem' }}>
        <div className="skeleton" style={{ height: '0.7rem', width: '38%', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '1.1rem', width: '78%', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '0.82rem', width: '52%', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '0.82rem', width: '42%', borderRadius: '4px' }} />
      </div>
      <div className="activity-card__footer">
        <div className="skeleton" style={{ height: '2.4rem', borderRadius: '999px' }} />
      </div>
    </div>
  );
}

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
  const [zonaPrincipalFilter, setZonaPrincipalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ActivityStatusFilter>('futuras');
  const [sort, setSort] = useState<ActivitySort>('fechaAsc');
  const [savedActivityIds, setSavedActivityIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let isFirstLoad = true;

    async function loadPageData() {
      try {
        const [activitiesData, userData, savedData] = await Promise.all([
          fetchActivities({
            categoria: selectedCategory,
            zonaPrincipal: zonaPrincipalFilter || undefined,
            estado: statusFilter,
            sort,
          }),
          fetchCurrentUser(),
          fetchSavedActivities().catch(() => [] as Activity[]),
        ]);
        if (isMounted) {
          setActivities(activitiesData);
          setCurrentUser(userData);
          setSavedActivityIds(new Set(savedData.map((a) => a._id)));
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
  }, [selectedCategory, zonaPrincipalFilter, statusFilter, sort]);

  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;

  async function handleToggleSave(activityId: string) {
    const isSaved = savedActivityIds.has(activityId);
    setSavedActivityIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
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
  const sectionTitle = selectedCategory || zonaPrincipalFilter
    ? 'Resultados filtrados'
    : statusFilter === 'pasadas'
      ? 'Actividades pasadas'
      : statusFilter === 'todas'
        ? 'Todas las actividades'
        : 'Proximas actividades';
  const emptyMessage = selectedCategory || zonaPrincipalFilter
    ? 'No hay actividades que coincidan con los filtros seleccionados.'
    : statusFilter === 'pasadas'
      ? 'No hay actividades pasadas.'
      : 'No hay actividades proximas todavia.';
  const activeFiltersCount = [zonaPrincipalFilter, statusFilter !== 'futuras' ? statusFilter : '', sort !== 'fechaAsc' ? sort : '']
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
          <Link className="button button--primary" to="/activities/new">Crear actividad</Link>
        </div>
      </header>

      <div className="category-chips" role="group" aria-label="Filtrar por categoria">
        <button
          type="button"
          className={`category-chips__chip${selectedCategory === '' ? ' category-chips__chip--active' : ''}`}
          onClick={() => setSelectedCategory('')}
        >
          Todas
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`category-chips__chip${selectedCategory === cat ? ' category-chips__chip--active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            <span aria-hidden="true">{CATEGORY_VISUALS[cat]?.emoji}</span>
            {cat}
          </button>
        ))}
      </div>

      <section className="activities-stack">
        {isLoading && (
          <div className="activity-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonActivityCard key={i} />)}
          </div>
        )}
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
                  Provincia / zona
                  <select value={zonaPrincipalFilter} onChange={(event) => setZonaPrincipalFilter(event.target.value)}>
                    <option value="">Todas</option>
                    {PROVINCIAS.map((p) => <option key={p}>{p}</option>)}
                  </select>
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
          <div className="empty-state">
            <div className="empty-state__icon">🔍</div>
            <p className="empty-state__title">Sin resultados</p>
            <p className="empty-state__body">{emptyMessage}</p>
          </div>
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
                zonaPrincipal={activity.zonaPrincipal}
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
                isSaved={savedActivityIds.has(activity._id)}
                onToggleSave={currentUserId ? () => handleToggleSave(activity._id) : undefined}
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}
