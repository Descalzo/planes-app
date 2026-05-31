import { Link } from 'react-router-dom';

interface ActivityCardProps {
  id: string;
  title: string;
  category?: string;
  city?: string;
  spots?: number;
  participants?: number;
  isJoined?: boolean;
  isRemoved?: boolean;
  hasActivityUpdates?: boolean;
  hasUnreadMessages?: boolean;
  leftUsersCount?: number;
}

export default function ActivityCard({
  id,
  title,
  category,
  city,
  spots,
  participants = 0,
  isJoined = false,
  isRemoved = false,
  hasActivityUpdates = false,
  hasUnreadMessages = false,
  leftUsersCount = 0,
}: ActivityCardProps) {
  const availableSpots = typeof spots === 'number' ? Math.max(spots - participants, 0) : null;
  const cardClassName = isRemoved
    ? 'activity-card activity-card--removed'
    : isJoined
      ? 'activity-card activity-card--joined'
      : 'activity-card';

  return (
    <article className={cardClassName}>
      <div className="activity-card__content">
        <div className="activity-card__topline">
          <p className="activity-card__meta">{[category, city].filter(Boolean).join(' · ') || 'Sin categoria'}</p>
          {isJoined && <span className="activity-card__badge">Ya unido</span>}
          {isRemoved && <span className="activity-card__badge activity-card__badge--removed">Te han quitado</span>}
        </div>
        {(isRemoved || hasActivityUpdates || hasUnreadMessages || leftUsersCount > 0) && (
          <div className="activity-card__notices">
            {isRemoved && <span>Ya no formas parte de esta actividad</span>}
            {leftUsersCount > 0 && <span>{leftUsersCount} se desapuntaron</span>}
            {hasActivityUpdates && <Link className="activity-card__notice-link" to={`/activities/${id}`}>Novedades en tu actividad</Link>}
            {hasUnreadMessages && <Link className="activity-card__notice-link" to={`/activities/${id}/chat`}>Mensajes nuevos</Link>}
          </div>
        )}
        <h2>{title}</h2>
        <p className="activity-card__spots">
          {availableSpots === null
            ? `${participants} participantes`
            : `${participants} participantes · ${availableSpots} plazas disponibles`}
        </p>
      </div>
      <Link className="button button--secondary" to={`/activities/${id}`}>
        Ver actividad
      </Link>
    </article>
  );
}
