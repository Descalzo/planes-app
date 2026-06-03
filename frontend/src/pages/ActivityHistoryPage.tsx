import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  fetchActivities,
  fetchRequestedActivities,
  getActivityParticipantsCount,
  isActivityCreator,
  isUserInActivity,
  isUserPendingInActivity,
  isUserRejectedFromActivity,
} from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import { getActivityTime, isActivityArchived } from '../utils/activityLifecycle';

interface HistoryItem {
  activity: Activity;
  roles: Set<string>;
}

function addRole(items: Map<string, HistoryItem>, activity: Activity, role: string) {
  const existing = items.get(activity._id);
  if (existing) {
    existing.roles.add(role);
    return;
  }

  items.set(activity._id, { activity, roles: new Set([role]) });
}

function formatDate(value?: string) {
  if (!value) return 'Fecha no definida';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(value));
}

export default function ActivityHistoryPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [requestedActivities, setRequestedActivities] = useState<Activity[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        const [activitiesData, requestedData, userData] = await Promise.all([
          fetchActivities({ estado: 'todas', sort: 'fechaAsc', limit: 120 }),
          fetchRequestedActivities().catch(() => [] as Activity[]),
          fetchCurrentUser(),
        ]);

        if (isMounted) {
          setActivities(activitiesData);
          setRequestedActivities(requestedData);
          setCurrentUser(userData);
          setError(null);
        }
      } catch {
        if (isMounted) setError('No se pudo cargar el historial');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const historyItems = useMemo(() => {
    const userId = currentUser?._id ?? currentUser?.id ?? null;
    if (!userId) return [];

    const now = Date.now();
    const items = new Map<string, HistoryItem>();
    const isArchived = (a: Activity) => isActivityArchived(a, now);

    activities.filter(isArchived).forEach((activity) => {
      if (isActivityCreator(activity, userId)) addRole(items, activity, 'Organizador');
      else if (isUserInActivity(activity, userId)) addRole(items, activity, 'Participante');
    });

    requestedActivities.filter(isArchived).forEach((activity) => {
      if (isUserPendingInActivity(activity, userId)) addRole(items, activity, 'Solicitante');
      else if (isUserRejectedFromActivity(activity, userId)) addRole(items, activity, 'Solicitud rechazada');
    });

    return [...items.values()].sort((a, b) => getActivityTime(b.activity) - getActivityTime(a.activity));
  }, [activities, requestedActivities, currentUser]);

  return (
    <main className="page">
      <header>
        <div>
          <h1>Historial de actividades</h1>
          <p>Actividades ya realizadas y archivadas tras el periodo de 24 horas.</p>
        </div>
      </header>

      <section className="history-list">
        {isLoading && <p>Cargando historial...</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && historyItems.length === 0 && (
          <p>No hay actividades archivadas en tu historial.</p>
        )}
        {historyItems.map(({ activity, roles }) => (
          <Link className="history-item" key={activity._id} to={`/activities/${activity._id}`}>
            <div>
              <h2>{activity.titulo}</h2>
              <p>
                {[activity.zonaPrincipal || activity.ciudad, formatDate(activity.fecha), `${getActivityParticipantsCount(activity, currentUser?._id ?? currentUser?.id)} asistentes`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <span>{[...roles].join(', ')}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
