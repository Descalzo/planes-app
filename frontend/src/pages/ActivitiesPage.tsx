import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ActivityCard from '../components/ActivityCard';
import { Activity, fetchActivities } from '../services/activityService';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchActivities()
      .then((data) => {
        if (isMounted) {
          setActivities(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No se pudieron cargar las actividades');
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
  }, []);

  return (
    <main className="page page--activities">
      <header>
        <div>
          <h1>Actividades</h1>
          <p>Explora las actividades disponibles y unete a las que mas te interesen.</p>
        </div>
        <Link to="/activities/new">Crear actividad</Link>
      </header>
      <section>
        {isLoading && <p>Cargando actividades...</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && activities.length === 0 && <p>No hay actividades todavia.</p>}
        {activities.map((activity) => (
          <ActivityCard
            key={activity._id}
            id={activity._id}
            title={activity.titulo}
            category={activity.categoria}
            city={activity.ciudad}
            spots={activity.plazas}
            participants={activity.participantes?.length ?? 0}
          />
        ))}
      </section>
    </main>
  );
}
