import { Link } from 'react-router-dom';

interface ActivityCardProps {
  id: string;
  title: string;
  category?: string;
  city?: string;
  spots?: number;
  participants?: number;
}

export default function ActivityCard({ id, title, category, city, spots, participants = 0 }: ActivityCardProps) {
  const availableSpots = typeof spots === 'number' ? Math.max(spots - participants, 0) : null;

  return (
    <article className="activity-card">
      <h2>{title}</h2>
      <p>{[category, city].filter(Boolean).join(' · ') || 'Sin categoria'}</p>
      <p>{availableSpots === null ? 'Plazas no indicadas' : `${availableSpots} plazas disponibles`}</p>
      <Link to={`/activities/${id}`}>Ver actividad</Link>
    </article>
  );
}
