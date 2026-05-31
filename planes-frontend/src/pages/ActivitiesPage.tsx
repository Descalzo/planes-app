import { Link } from 'react-router-dom';
import ActivityCard from '../components/ActivityCard';

export default function ActivitiesPage() {
  return (
    <main className="page page--activities">
      <header>
        <div>
          <h1>Actividades</h1>
          <p>Explora las actividades disponibles y únete a las que más te interesen.</p>
        </div>
        <Link to="/activities/new">Crear actividad</Link>
      </header>
      <section>
        <ActivityCard title="Ruta por la sierra" category="senderismo" city="Madrid" spots={5} />
        <ActivityCard title="Salida urbana" category="cultura" city="Barcelona" spots={8} />
      </section>
    </main>
  );
}
