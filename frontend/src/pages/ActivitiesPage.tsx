import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ActivityCard from '../components/ActivityCard';
import {
  Activity,
  ActivitySort,
  fetchActivities,
  fetchSavedActivities,
  saveActivity,
  unsaveActivity,
  getActivityParticipantsCount,
  isActivityCreator,
  isUserRemovedFromActivity,
  isUserInActivity,
} from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { fetchUnreadMessageActivityIds } from '../services/internalNotificationService';
import { hasActivityUpdates } from '../services/notificationService';
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
  const [mostrarFinalizadas, setMostrarFinalizadas] = useState(false);
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
            estado: mostrarFinalizadas ? 'todas' : 'futuras',
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
  }, [selectedCategory, zonaPrincipalFilter, mostrarFinalizadas, sort]);

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
  const chipsRef = useRef<HTMLDivElement>(null);
  const chipsDragStart = useRef({ x: 0, scrollLeft: 0, active: false });
  const [chipsIsDragging, setChipsIsDragging] = useState(false);

  function handleChipsWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!chipsRef.current) return;
    e.preventDefault();
    chipsRef.current.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
  }

  function handleChipsMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!chipsRef.current) return;
    chipsDragStart.current = { x: e.clientX, scrollLeft: chipsRef.current.scrollLeft, active: true };
  }

  function handleChipsMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!chipsDragStart.current.active || !chipsRef.current) return;
    const dx = e.clientX - chipsDragStart.current.x;
    if (!chipsIsDragging && Math.abs(dx) > 4) setChipsIsDragging(true);
    chipsRef.current.scrollLeft = chipsDragStart.current.scrollLeft - dx;
  }

  function handleChipsMouseUp() {
    chipsDragStart.current.active = false;
    setChipsIsDragging(false);
  }

  const sectionTitle = selectedCategory || zonaPrincipalFilter
    ? 'Resultados filtrados'
    : mostrarFinalizadas ? 'Todas las actividades' : 'Proximas actividades';
  const emptyMessage = selectedCategory || zonaPrincipalFilter
    ? 'No hay actividades que coincidan con los filtros seleccionados.'
    : mostrarFinalizadas ? 'No hay actividades.' : 'No hay actividades proximas todavia.';
  const activeFiltersCount = [
    zonaPrincipalFilter,
    mostrarFinalizadas ? 'finalizadas' : '',
    sort !== 'fechaAsc' ? sort : '',
  ].filter(Boolean).length;

  useEffect(() => {
    if (!currentUserId || activities.length === 0) {
      setUnreadMessageActivityIds(new Set());
      return;
    }

    let isMounted = true;
    const visibleActivityIds = new Set(
      activities
        .filter((activity) => isUserInActivity(activity, currentUserId) || isActivityCreator(activity, currentUserId))
        .map((activity) => activity._id),
    );

    async function loadUnreadMessages() {
      try {
        const activityIds = await fetchUnreadMessageActivityIds();
        if (isMounted) {
          setUnreadMessageActivityIds(new Set(activityIds.filter((id) => visibleActivityIds.has(id))));
        }
      } catch {
        if (isMounted) {
          setUnreadMessageActivityIds(new Set());
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

      <div
        className={`category-chips${chipsIsDragging ? ' category-chips--dragging' : ''}`}
        role="group"
        aria-label="Filtrar por categoria"
        ref={chipsRef}
        onWheel={handleChipsWheel}
        onMouseDown={handleChipsMouseDown}
        onMouseMove={handleChipsMouseMove}
        onMouseUp={handleChipsMouseUp}
        onMouseLeave={handleChipsMouseUp}
      >
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
                  Ordenar por
                  <select value={sort} onChange={(event) => setSort(event.target.value as ActivitySort)}>
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <div className="activity-filters__toggle">
                  <span className="activity-filters__toggle-text">Mostrar finalizadas</span>
                  <button
                    className={`toggle-switch${mostrarFinalizadas ? ' toggle-switch--on' : ''}`}
                    type="button"
                    role="switch"
                    aria-checked={mostrarFinalizadas}
                    onClick={() => setMostrarFinalizadas((v) => !v)}
                  >
                    <span className="toggle-switch__thumb" />
                  </button>
                </div>
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
                estado={activity.estado}
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
