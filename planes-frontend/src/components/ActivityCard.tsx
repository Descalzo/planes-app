import { Link } from 'react-router-dom';

interface ActivityCardProps {
  title: string;
  category: string;
  city: string;
  spots: number;
}

export default function ActivityCard({ title, category, city, spots }: ActivityCardProps) {
  return (
    <article className="activity-card">
      <h2>{title}</h2>
      <p>{category} · {city}</p>
      <p>{spots} plazas disponibles</p>
      <Link to="#">Ver actividad</Link>
    </article>
  );
}
