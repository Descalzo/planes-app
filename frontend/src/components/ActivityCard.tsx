import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategoryVisual, getActivityImage } from '../utils/activityImages';
import SaveMarkerIcon from './SaveMarkerIcon';

interface ActivityCardProps {
  id: string;
  title: string;
  category?: string;
  city?: string;
  date?: string;
  spots?: number;
  occupiedSpots?: number;
  availableSpots?: number;
  participants?: number;
  imagenUrl?: string;
  isJoined?: boolean;
  isCreator?: boolean;
  isRemoved?: boolean;
  requestStatus?: 'pending' | 'rejected';
  hasActivityUpdates?: boolean;
  hasUnreadMessages?: boolean;
  leftUsersCount?: number;
  isSaved?: boolean;
  privateChatUserId?: string;
  onToggleSave?: () => void;
}

export default function ActivityCard({
  id,
  title,
  category,
  city,
  date,
  spots,
  occupiedSpots,
  availableSpots,
  participants = 0,
  imagenUrl,
  isJoined = false,
  isCreator = false,
  isRemoved = false,
  requestStatus,
  hasActivityUpdates = false,
  hasUnreadMessages = false,
  leftUsersCount = 0,
  isSaved = false,
  privateChatUserId,
  onToggleSave,
}: ActivityCardProps) {
  const totalSpots = typeof spots === 'number' ? spots : 10;
  const usedSpots = typeof occupiedSpots === 'number' ? occupiedSpots : participants;
  const freeSpots = typeof availableSpots === 'number' ? availableSpots : Math.max(totalSpots - usedSpots, 0);
  const isFull = freeSpots <= 0;
  const formattedDate = date
    ? new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(date))
    : 'Fecha por definir';
  const cardClassName = isRemoved
    ? 'activity-card activity-card--removed'
    : isJoined
      ? 'activity-card activity-card--joined'
      : 'activity-card';

  const visual = getCategoryVisual(category);
  const [imgError, setImgError] = useState(false);
  const imageUrl = getActivityImage(imagenUrl, category);
  const isDefaultImage = !imagenUrl?.trim();

  return (
    <article className={cardClassName}>
      <Link
        className="activity-card__link-overlay"
        to={`/activities/${id}`}
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="activity-card__media">
        {!imgError ? (
          <img
            className={`activity-card__image${isDefaultImage ? ' activity-card__image--default' : ''}`}
            src={imageUrl}
            alt={title}
            onError={() => setImgError(true)}
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
        {onToggleSave && (
          <button
            className={`activity-card__save-btn${isSaved ? ' activity-card__save-btn--saved' : ''}`}
            type="button"
            aria-label={isSaved ? 'Quitar de guardadas' : 'Guardar actividad'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave();
            }}
          >
            <SaveMarkerIcon filled={isSaved} />
          </button>
        )}
      </div>
      <div className="activity-card__content">
        <div className="activity-card__topline">
          <p className="activity-card__meta">{[category, city].filter(Boolean).join(' · ') || 'Sin categoria'}</p>
          {isCreator
            ? <span className="activity-card__badge activity-card__badge--creator">Creada por ti</span>
            : requestStatus === 'pending'
              ? <span className="activity-card__badge">Solicitud pendiente</span>
              : requestStatus === 'rejected'
                ? <span className="activity-card__badge activity-card__badge--removed">Solicitud rechazada</span>
                : isJoined && <span className="activity-card__badge">Ya unido</span>
          }
          {isRemoved && <span className="activity-card__badge activity-card__badge--removed">Te han quitado</span>}
        </div>
        {(requestStatus || isRemoved || hasActivityUpdates || hasUnreadMessages || leftUsersCount > 0) && (
          <div className="activity-card__notices">
            {requestStatus === 'pending' && <span>Solicitud pendiente de aprobacion</span>}
            {requestStatus === 'rejected' && <span>Solicitud rechazada</span>}
            {isRemoved && <span>Ya no formas parte de esta actividad</span>}
            {leftUsersCount > 0 && <span>{leftUsersCount} se desapuntaron</span>}
            {hasActivityUpdates && <Link className="activity-card__notice-link" to={`/activities/${id}`}>Novedades en tu actividad</Link>}
            {hasUnreadMessages && <Link className="activity-card__notice-link" to={`/activities/${id}/chat`}>Mensajes nuevos</Link>}
          </div>
        )}
        <h2>{title}</h2>
        <p className="activity-card__date">{formattedDate}</p>
        <div className="activity-card__spots">
          <div className="activity-card__spots-bar">
            <div
              className={`activity-card__spots-fill${isFull ? ' activity-card__spots-fill--full' : ''}`}
              style={{ width: `${Math.min((usedSpots / totalSpots) * 100, 100)}%` }}
            />
          </div>
          <span className="activity-card__spots-label">
            {isFull ? 'Completo · Sin plazas' : `${freeSpots} de ${totalSpots} plazas libres`}
          </span>
        </div>
      </div>
      {privateChatUserId && (
        <div className="activity-card__footer">
          <Link className="button button--ghost" to={`/activities/${id}/private-chat/${privateChatUserId}`}>
            Preguntar al organizador
          </Link>
        </div>
      )}
    </article>
  );
}
