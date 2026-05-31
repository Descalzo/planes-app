import { Link } from 'react-router-dom';
import { getCategoryVisual } from '../utils/activityImages';

interface ActivityCardProps {
  id: string;
  title: string;
  category?: string;
  city?: string;
  spots?: number;
  participants?: number;
  imagenUrl?: string;
  isJoined?: boolean;
  isCreator?: boolean;
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
  imagenUrl,
  isJoined = false,
  isCreator = false,
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

  const visual = getCategoryVisual(category);

  return (
    <article className={cardClassName}>
      {imagenUrl ? (
        <img
          className="activity-card__image"
          src={imagenUrl}
          alt={title}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className="activity-card__image activity-card__image--placeholder"
          style={{ background: visual.gradient }}
          aria-hidden="true"
        >
          <span>{visual.emoji}</span>
        </div>
      )}
      <div className="activity-card__content">
        <div className="activity-card__topline">
          <p className="activity-card__meta">{[category, city].filter(Boolean).join(' · ') || 'Sin categoria'}</p>
          {isCreator
            ? <span className="activity-card__badge activity-card__badge--creator">Creada por ti</span>
            : isJoined && <span className="activity-card__badge">Ya unido</span>
          }
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
      <div className="activity-card__footer">
        <Link className="button button--secondary" to={`/activities/${id}`}>
          Ver actividad
        </Link>
      </div>
    </article>
  );
}
