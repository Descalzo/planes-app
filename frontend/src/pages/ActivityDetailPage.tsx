import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  acceptActivityRequest,
  Activity,
  fetchActivity,
  getReferenceId,
  getReferenceName,
  isActivityCreator,
  isActivitySavedByUser,
  isUserMutedInActivity,
  isUserPendingInActivity,
  isUserRejectedFromActivity,
  isUserRemovedFromActivity,
  isUserInActivity,
  joinActivity,
  leaveActivity,
  muteActivityParticipant,
  rejectActivityRequest,
  removeActivityParticipant,
  saveActivity,
  unbanActivityParticipant,
  unmuteActivityParticipant,
  unsaveActivity,
} from '../services/activityService';
import { CurrentUser, fetchCurrentUser } from '../services/authService';
import {
  fetchUnreadPrivateMessageActorIds,
  markStatusNotificationsReadByActivity,
} from '../services/internalNotificationService';
import { markActivitySeen } from '../services/notificationService';
import {
  fetchPrivateActivityConversations,
  PrivateActivityConversation,
} from '../services/privateActivityChatService';
import { hasActivityStarted, isActivityArchived } from '../utils/activityLifecycle';
import { getCategoryVisual, getActivityImage } from '../utils/activityImages';
import SaveMarkerIcon from '../components/SaveMarkerIcon';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    if (response?.status === 401) {
      return 'Debes iniciar sesion para solicitar plaza';
    }

    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo completar la accion';
  }

  return 'No se pudo completar la accion';
}

export default function ActivityDetailPage() {
  const { activityId } = useParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const [mutingParticipantId, setMutingParticipantId] = useState<string | null>(null);
  const [unbanningParticipantId, setUnbanningParticipantId] = useState<string | null>(null);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);
  const [privateConversations, setPrivateConversations] = useState<PrivateActivityConversation[]>([]);
  const [unreadPrivateActorIds, setUnreadPrivateActorIds] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);
  const [detailImgError, setDetailImgError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) {
      setIsLoading(false);
      setError('Actividad no valida');
      return;
    }

    const currentActivityId = activityId;
    let isMounted = true;
    let viewerId: string | null = null;

    async function loadInitialData() {
      try {
        const [activityData, userData] = await Promise.all([fetchActivity(currentActivityId), fetchCurrentUser()]);
        if (isMounted) {
          setActivity(activityData);
          setCurrentUser(userData);
          viewerId = userData._id ?? userData.id ?? null;
          markActivitySeen(activityData._id, viewerId);
          markStatusNotificationsReadByActivity(activityData._id).catch(() => {});
          window.dispatchEvent(new Event('planes:notifications-changed'));
          setIsSaved(isActivitySavedByUser(activityData, viewerId));
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('No se pudo cargar la actividad');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    async function refreshActivity() {
      try {
        const activityData = await fetchActivity(currentActivityId);
        if (isMounted) {
          setActivity(activityData);
          markActivitySeen(activityData._id, viewerId);
        }
      } catch {
        if (isMounted) {
          setError('No se pudo cargar la actividad');
        }
      }
    }

    loadInitialData();
    const intervalId = window.setInterval(refreshActivity, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activityId]);

  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;

  useEffect(() => {
    if (!activityId || !activity || !currentUserId || !isActivityCreator(activity, currentUserId)) {
      setPrivateConversations([]);
      setUnreadPrivateActorIds(new Set());
      return;
    }

    const currentActivityId = activityId;
    let isMounted = true;

    async function loadPrivateConversations() {
      try {
        const [conversations, actorIds] = await Promise.all([
          fetchPrivateActivityConversations(currentActivityId),
          fetchUnreadPrivateMessageActorIds(currentActivityId),
        ]);
        if (isMounted) {
          setPrivateConversations(conversations);
          setUnreadPrivateActorIds(new Set(actorIds));
        }
      } catch {
        if (isMounted) {
          setPrivateConversations([]);
          setUnreadPrivateActorIds(new Set());
        }
      }
    }

    loadPrivateConversations();
    const intervalId = window.setInterval(loadPrivateConversations, 10000);
    window.addEventListener('planes:messages-changed', loadPrivateConversations);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('planes:messages-changed', loadPrivateConversations);
    };
  }, [activityId, activity, currentUserId]);

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

  async function handleAcceptRequest(userId: string) {
    if (!activityId) {
      return;
    }

    setError(null);
    setRequestActionId(userId);
    try {
      const updatedActivity = await acceptActivityRequest(activityId, userId);
      setActivity(updatedActivity);
      markActivitySeen(updatedActivity._id, currentUserId);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setRequestActionId(null);
    }
  }

  async function handleRejectRequest(userId: string) {
    if (!activityId) {
      return;
    }

    setError(null);
    setRequestActionId(userId);
    try {
      const updatedActivity = await rejectActivityRequest(activityId, userId);
      setActivity(updatedActivity);
      markActivitySeen(updatedActivity._id, currentUserId);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setRequestActionId(null);
    }
  }

  async function handleRemoveParticipant(participantId: string) {
    if (!activityId) {
      return;
    }

    setError(null);
    setRemovingParticipantId(participantId);
    try {
      const updatedActivity = await removeActivityParticipant(activityId, participantId);
      setActivity(updatedActivity);
      markActivitySeen(updatedActivity._id, currentUserId);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setRemovingParticipantId(null);
    }
  }

  async function handleLeave() {
    if (!activityId) {
      return;
    }

    setError(null);
    setIsLeaving(true);
    try {
      const updatedActivity = await leaveActivity(activityId);
      setActivity(updatedActivity);
      markActivitySeen(updatedActivity._id, currentUserId);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLeaving(false);
    }
  }

  async function handleToggleMute(participantId: string, isMuted: boolean) {
    if (!activityId) {
      return;
    }

    setError(null);
    setMutingParticipantId(participantId);
    try {
      const updatedActivity = isMuted
        ? await unmuteActivityParticipant(activityId, participantId)
        : await muteActivityParticipant(activityId, participantId);
      setActivity(updatedActivity);
      markActivitySeen(updatedActivity._id, currentUserId);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setMutingParticipantId(null);
    }
  }

  async function handleUnban(participantId: string) {
    if (!activityId) {
      return;
    }

    setError(null);
    setUnbanningParticipantId(participantId);
    try {
      const updatedActivity = await unbanActivityParticipant(activityId, participantId);
      setActivity(updatedActivity);
      markActivitySeen(updatedActivity._id, currentUserId);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setUnbanningParticipantId(null);
    }
  }

  const acceptedParticipants = activity?.plazasOcupadas ?? (activity?.participantes?.length ?? 0);
  const totalSpots = activity?.plazas ?? 10;
  const availableSpots = activity?.plazasDisponibles ?? Math.max(totalSpots - acceptedParticipants, 0);
  const isFull = availableSpots <= 0;
  const isJoined = Boolean(activity && currentUserId && isUserInActivity(activity, currentUserId));
  const isCreator = Boolean(activity && currentUserId && isActivityCreator(activity, currentUserId));
  const isPending = Boolean(activity && currentUserId && isUserPendingInActivity(activity, currentUserId));
  const isRejected = Boolean(activity && currentUserId && isUserRejectedFromActivity(activity, currentUserId));
  const isRemoved = Boolean(activity && currentUserId && isUserRemovedFromActivity(activity, currentUserId));
  const hasStarted = Boolean(activity && hasActivityStarted(activity));
  const isArchived = Boolean(activity && isActivityArchived(activity));
  const canUseChat = !isArchived;
  const creatorId = activity ? getReferenceId(activity.creador) : null;
  const visibleParticipants = activity
    ? (activity.participantes ?? []).filter((participant, index, allParticipants) => {
        const participantId = getReferenceId(participant);
        return (
          Boolean(participantId) &&
          participantId !== creatorId &&
          allParticipants.findIndex((item) => getReferenceId(item) === participantId) === index
        );
      })
    : [];
  const usersWhoLeft = activity?.salidas ?? [];
  const bannedUsers = activity?.expulsados ?? [];
  const pendingRequests = activity?.solicitudesPendientes ?? [];
  const mutedUsers = activity?.chatSilenciados ?? [];

  async function handleToggleSave() {
    if (!activityId) return;
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    try {
      if (wasSaved) await unsaveActivity(activityId);
      else await saveActivity(activityId);
    } catch {
      setIsSaved(wasSaved);
    }
  }

  return (
    <main className="page page--detail">
      <header>
        <h1>{activity?.titulo ?? 'Detalle de actividad'}</h1>
        {activity && currentUserId && !hasStarted && (
          <button
            className={`activity-card__save-btn detail-save-btn${isSaved ? ' activity-card__save-btn--saved' : ''}`}
            type="button"
            aria-label={isSaved ? 'Quitar de guardadas' : 'Guardar actividad'}
            onClick={handleToggleSave}
          >
            <SaveMarkerIcon filled={isSaved} size={20} />
          </button>
        )}
      </header>
      <section>
        {isLoading && <p>Cargando actividad...</p>}
        {error && <p role="alert">{error}</p>}
        {activity && (
          <div className="detail-card">
            {(() => {
              const visual = getCategoryVisual(activity.categoria);
              const imageUrl = getActivityImage(activity.imagenUrl, activity.categoria);
              const isDefaultImage = !activity.imagenUrl?.trim();
              return !detailImgError ? (
                <img
                  className={`detail-card__image${isDefaultImage ? ' detail-card__image--default' : ''}`}
                  src={imageUrl}
                  alt={activity.titulo}
                  onError={() => setDetailImgError(true)}
                />
              ) : (
                <div
                  className="detail-card__image detail-card__image--placeholder"
                  style={{ background: visual.gradient }}
                  aria-hidden="true"
                >
                  <span>{visual.emoji}</span>
                </div>
              );
            })()}
            <p className="detail-card__description">{activity.descripcion || 'Sin descripcion'}</p>
            <div className="detail-grid">
              <p><span>Categoria / lugar</span>{[activity.categoria || 'Sin categoria', activity.zonaPrincipal || activity.ciudad].filter(Boolean).join(' · ')}</p>
              <p><span>Fecha / participantes</span>{activity.fecha ? new Date(activity.fecha).toLocaleString() : 'Fecha por definir'} · {acceptedParticipants} aceptados</p>
              <p><span>Plazas</span>{isFull ? 'Completa' : `${availableSpots} libres`} · {totalSpots} totales</p>
            </div>
            <div className="creator-info">
              <h3>Organizador</h3>
              <div className="creator-card">
                <div>
                  <strong>{getReferenceName(activity.creador)}</strong>
                </div>
                {!isCreator && getReferenceId(activity.creador) !== currentUserId && (
                  <Link
                    className="button button--ghost button--small"
                    to={`/users/${getReferenceId(activity.creador)}/profile?activityId=${activityId}`}
                  >
                    Ver perfil
                  </Link>
                )}
              </div>
            </div>
            {isCreator && (
              <div className="participants-panel">
                {!hasStarted && (
                  <>
                    <h2>Solicitudes pendientes</h2>
                    {pendingRequests.length === 0 ? (
                      <p>No hay solicitudes pendientes.</p>
                    ) : (
                      <div className="participants-list">
                        {pendingRequests.map((user) => {
                          const userId = getReferenceId(user);
                          if (!userId) {
                            return null;
                          }

                          return (
                            <div className="participant-row" key={userId}>
                              <div>
                                <strong>{getReferenceName(user)}</strong>
                                <span> Pendiente</span>
                              </div>
                              <div className="participant-actions participant-actions--review">
                                <Link
                                  className="button button--ghost button--small"
                                  to={`/users/${userId}/profile?activityId=${activityId}`}
                                >
                                  Ver perfil
                                </Link>
                                <button
                                  className="button button--secondary button--small"
                                  type="button"
                                  disabled={requestActionId === userId || isFull}
                                  onClick={() => handleAcceptRequest(userId)}
                                >
                                  {requestActionId === userId ? 'Guardando...' : isFull ? 'Completa' : 'Aceptar'}
                                </button>
                                <button
                                  className="button button--ghost button--small"
                                  type="button"
                                  disabled={requestActionId === userId}
                                  onClick={() => handleRejectRequest(userId)}
                                >
                                  Rechazar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                <h2>Participantes</h2>
                <div className="participants-list">
                  {visibleParticipants
                    .map((participant) => {
                      const participantId = getReferenceId(participant);
                      const isCurrentCreator = participantId === currentUserId;
                      const isMuted = Boolean(activity && participantId && isUserMutedInActivity(activity, participantId));

                      if (!participantId) {
                        return null;
                      }

                      return (
                        <div className="participant-row" key={participantId}>
                          <div>
                            <strong>{getReferenceName(participant)}</strong>
                            {isCurrentCreator && <span> Tú (Creador)</span>}
                            {isMuted && <span> Silenciado</span>}
                          </div>
                          <div className="participant-actions">
                            {!isCurrentCreator && (
                              <Link 
                                className="button button--ghost button--small" 
                                to={`/users/${participantId}/profile?activityId=${activityId}`}
                              >
                                Ver perfil
                              </Link>
                            )}
                            {!isArchived && !isCurrentCreator && (
                              <details className="participant-more">
                                <summary className="button button--ghost button--small">Mas</summary>
                                <div className="participant-more__menu">
                                  <button
                                    className="button button--ghost button--small"
                                    type="button"
                                    disabled={mutingParticipantId === participantId}
                                    onClick={() => handleToggleMute(participantId, isMuted)}
                                  >
                                    {mutingParticipantId === participantId
                                      ? 'Guardando...'
                                      : isMuted
                                        ? 'Permitir hablar'
                                        : 'Silenciar chat'}
                                  </button>
                                  <button
                                    className="button button--ghost button--small"
                                    type="button"
                                    disabled={removingParticipantId === participantId}
                                    onClick={() => handleRemoveParticipant(participantId)}
                                  >
                                    {removingParticipantId === participantId ? 'Quitando...' : 'Quitar'}
                                  </button>
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
                {usersWhoLeft.length > 0 && (
                  <>
                    <h2>Se desapuntaron</h2>
                    <div className="participants-list">
                      {usersWhoLeft.map((user) => {
                        const userId = getReferenceId(user);
                        if (!userId) {
                          return null;
                        }

                        return (
                          <div className="participant-row" key={userId}>
                            <div>
                              <strong>{getReferenceName(user)}</strong>
                              <span> Se desapunto</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {mutedUsers.length > 0 && (
                  <>
                    <h2>Silenciados</h2>
                    <div className="participants-list">
                      {mutedUsers.map((user) => {
                        const userId = getReferenceId(user);
                        if (!userId) {
                          return null;
                        }

                        return (
                          <div className="participant-row" key={userId}>
                            <div>
                              <strong>{getReferenceName(user)}</strong>
                              <span> No puede escribir en el chat</span>
                            </div>
                            {!isArchived && (
                              <button
                                className="button button--ghost button--small"
                                type="button"
                                disabled={mutingParticipantId === userId}
                                onClick={() => handleToggleMute(userId, true)}
                              >
                                {mutingParticipantId === userId ? 'Guardando...' : 'Permitir hablar'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {bannedUsers.length > 0 && (
                  <>
                    <h2>Expulsados</h2>
                    <div className="participants-list">
                      {bannedUsers.map((user) => {
                        const userId = getReferenceId(user);
                        if (!userId) {
                          return null;
                        }

                        return (
                          <div className="participant-row" key={userId}>
                            <div>
                              <strong>{getReferenceName(user)}</strong>
                              <span> No puede volver a unirse</span>
                            </div>
                            {!isArchived && (
                              <button
                                className="button button--ghost button--small"
                                type="button"
                                disabled={unbanningParticipantId === userId}
                                onClick={() => handleUnban(userId)}
                              >
                                {unbanningParticipantId === userId ? 'Desbaneando...' : 'Desbanear'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            {isJoined && !isCreator && (
              <div className="participants-panel">
                <h2>Participantes</h2>
                <div className="participants-list">
                  {visibleParticipants
                    .filter((p) => getReferenceId(p) !== currentUserId)
                    .map((participant) => {
                      const participantId = getReferenceId(participant);
                      if (!participantId) {
                        return null;
                      }

                      return (
                        <div className="participant-row" key={participantId}>
                          <div>
                            <strong>{getReferenceName(participant)}</strong>
                          </div>
                          {participantId !== currentUserId && (
                            <Link
                              className="button button--ghost button--small"
                              to={`/users/${participantId}/profile?activityId=${activityId}`}
                            >
                              Ver perfil
                            </Link>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            <div className="detail-actions">
              {isArchived ? (
                <p className="status-pill">Actividad finalizada</p>
              ) : hasStarted ? (
                <p className="status-pill">Actividad realizada - chat disponible durante 24 horas</p>
              ) : isRemoved ? (
                <p className="status-pill status-pill--danger">Te han quitado de esta actividad</p>
              ) : isPending ? (
                <>
                  <p className="status-pill">Solicitud pendiente de aprobacion</p>
                  {currentUserId && activityId && (
                    <Link className="button button--ghost" to={`/activities/${activityId}/private-chat/${currentUserId}`}>
                      Preguntar al organizador
                    </Link>
                  )}
                </>
              ) : isRejected ? (
                <>
                  <p className="status-pill status-pill--danger">Solicitud rechazada</p>
                  {isFull ? (
                    <p className="status-pill status-pill--danger">Actividad completa</p>
                  ) : (
                    <button className="button button--primary" type="button" onClick={handleJoin} disabled={isJoining}>
                      {isJoining ? 'Solicitando...' : 'Solicitar de nuevo'}
                    </button>
                  )}
                  {currentUserId && activityId && (
                    <Link className="button button--ghost" to={`/activities/${activityId}/private-chat/${currentUserId}`}>
                    Preguntar al organizador
                    </Link>
                  )}
                </>
              ) : isJoined ? (
                <>
                <p className="status-pill">{isCreator ? 'Eres el organizador' : 'Ya participas'}</p>
                  {!isCreator && (
                    <button className="button button--ghost" type="button" onClick={handleLeave} disabled={isLeaving}>
                      {isLeaving ? 'Saliendo...' : 'Desapuntarme'}
                    </button>
                  )}
                  {!isCreator && currentUserId && activityId && (
                    <Link className="button button--ghost" to={`/activities/${activityId}/private-chat/${currentUserId}`}>
                      Preguntar al organizador
                    </Link>
                  )}
                </>
              ) : isFull ? (
                <>
                  <p className="status-pill status-pill--danger">Actividad completa</p>
                  {currentUserId && activityId && (
                    <Link className="button button--ghost" to={`/activities/${activityId}/private-chat/${currentUserId}`}>
                      Preguntar al organizador
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <button className="button button--primary" type="button" onClick={handleJoin} disabled={isJoining}>
                    {isJoining ? 'Solicitando...' : 'Solicitar plaza'}
                  </button>
                  {currentUserId && activityId && (
                    <Link className="button button--ghost" to={`/activities/${activityId}/private-chat/${currentUserId}`}>
                      Preguntar al organizador
                    </Link>
                  )}
                </>
              )}
              {!hasStarted && isCreator && activityId && (
                <Link className="button button--primary detail-actions__primary" to={`/activities/${activityId}/edit`}>
                  Editar
                </Link>
              )}
              {!hasStarted && isCreator && activityId && (
                <Link
                  className={`button button--ghost detail-actions__secondary${unreadPrivateActorIds.size > 0 ? ' button--has-badge' : ''}`}
                  to={`/activities/${activityId}/conversations`}
                >
                  {unreadPrivateActorIds.size > 0 && (
                    <span className="button-badge" aria-label="Mensajes nuevos">●</span>
                  )}
                  Consultas privadas{privateConversations.length > 0 ? ` (${privateConversations.length})` : ''}
                </Link>
              )}
              {canUseChat && activityId && (isCreator || isJoined) && (
                <Link className="button button--secondary detail-actions__primary" to={`/activities/${activityId}/chat`}>
                  Ir al chat
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
