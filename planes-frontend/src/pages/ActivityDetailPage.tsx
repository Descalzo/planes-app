import { useParams, Link } from 'react-router-dom';

export default function ActivityDetailPage() {
  const { activityId } = useParams();

  return (
    <main className="page page--detail">
      <header>
        <h1>Detalle de actividad</h1>
        <Link to={`/activities/${activityId}/chat`}>Ir al chat</Link>
      </header>
      <section>
        <p>ID de la actividad: {activityId}</p>
        <p>Aquí se mostrará la información completa de la actividad.</p>
      </section>
    </main>
  );
}
