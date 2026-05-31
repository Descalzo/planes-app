import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity, fetchActivity, joinActivity } from '../services/activityService';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    if (response?.status === 401) {
      return 'Debes iniciar sesion para unirte';
    }

    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo completar la accion';
  }

  return 'No se pudo completar la accion';
}

export default function ActivityDetailPage() {
  const { activityId } = useParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) {
      setIsLoading(false);
      setError('Actividad no valida');
      return;
    }

    let isMounted = true;
    fetchActivity(activityId)
      .then((data) => {
        if (isMounted) {
          setActivity(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No se pudo cargar la actividad');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activityId]);

  async function handleJoin() {
    if (!activityId) {
      return;
    }

    setError(null);
    setIsJoining(true);
    try {
      const updatedActivity = await joinActivity(activityId);
      setActivity(updatedActivity);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsJoining(false);
    }
  }

  const participants = activity?.participantes?.length ?? 0;
  const availableSpots = typeof activity?.plazas === 'number' ? Math.max(activity.plazas - participants, 0) : null;

  return (
    <main className="page page--detail">
      <header>
        <h1>{activity?.titulo ?? 'Detalle de actividad'}</h1>
        {activityId && <Link to={`/activities/${activityId}/chat`}>Ir al chat</Link>}
      </header>
      <section>
        {isLoading && <p>Cargando actividad...</p>}
        {error && <p role="alert">{error}</p>}
        {activity && (
          <>
            <p>{activity.descripcion || 'Sin descripcion'}</p>
            <p>Categoria: {activity.categoria || 'Sin categoria'}</p>
            <p>Ciudad: {activity.ciudad || 'Sin ciudad'}</p>
            {activity.fecha && <p>Fecha: {new Date(activity.fecha).toLocaleString()}</p>}
            <p>Participantes: {participants}</p>
            <p>{availableSpots === null ? 'Plazas no indicadas' : `Plazas disponibles: ${availableSpots}`}</p>
            <button type="button" onClick={handleJoin} disabled={isJoining}>
              {isJoining ? 'Uniendo...' : 'Unirse'}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
