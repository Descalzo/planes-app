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
import { CurrentUser, fetchCurrentUser, fetchUserPublicProfile } from '../services/authService';
import {
  fetchUnreadMessageActivityIds,
  fetchUnreadPrivateMessageActorIds,
  markStatusNotificationsReadByActivity,
} from '../services/internalNotificationService';
import { markActivitySeen } from '../services/notificationService';
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

function getReferencePhotoUrl(reference: unknown) {
  if (!reference || typeof reference === 'string') {
    return null;
  }

  return (reference as { fotoPerfilUrl?: string }).fotoPerfilUrl ?? null;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

function ProfileAvatar({ reference, photoUrl }: { reference: unknown; photoUrl?: string | null }) {
  const name = getReferenceName(reference as any);
  const resolvedPhotoUrl = photoUrl ?? getReferencePhotoUrl(reference);

  return (
    <span className="participant-avatar" aria-hidden="true">
      {resolvedPhotoUrl ? <img src={resolvedPhotoUrl} alt="" /> : <span>{getInitials(name)}</span>}
    </span>
  );
}

function ChatBubbleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
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
  const [openParticipantMenuId, setOpenParticipantMenuId] = useState<string | null>(null);
  const [hasUnreadGeneralMessages, setHasUnreadGeneralMessages] = useState(false);
  const [unreadPrivateActorIds, setUnreadPrivateActorIds] = useState<Set<string>>(new Set());
  const [profilePhotoUrls, setProfilePhotoUrls] = useState<Record<string, string>>({});
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
    if (!activityId || !activity || !currentUserId) {
      setHasUnreadGeneralMessages(false);
      setUnreadPrivateActorIds(new Set());
      return;
    }

    const currentActivityId = activityId;
    let isMounted = true;

    async function loadUnreadPrivateMessages() {
      try {
        const [activityIds, actorIds] = await Promise.all([
          fetchUnreadMessageActivityIds(),
          fetchUnreadPrivateMessageActorIds(currentActivityId),
        ]);
        if (isMounted) {
          setHasUnreadGeneralMessages(activityIds.includes(currentActivityId));
          setUnreadPrivateActorIds(new Set(actorIds));
        }
      } catch {
        if (isMounted) {
          setHasUnreadGeneralMessages(false);
          setUnreadPrivateActorIds(new Set());
        }
      }
    }

    loadUnreadPrivateMessages();
    const intervalId = window.setInterval(loadUnreadPrivateMessages, 10000);
    window.addEventListener('planes:messages-changed', loadUnreadPrivateMessages);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('planes:messages-changed', loadUnreadPrivateMessages);
    };
  }, [activityId, activity, currentUserId]);

  useEffect(() => {
    if (!openParticipantMenuId) return;
    function handleOutside(e: PointerEvent) {
      if ((e.target as Element).closest('.participant-more')) return;
      setOpenParticipantMenuId(null);
    }
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [openParticipantMenuId]);

  useEffect(() => {
    if (!activity || !activityId || !currentUserId) return;

    const references = [
      activity.creador,
      ...(activity.participantes ?? []),
      ...(activity.solicitudesPendientes ?? []),
      ...(activity.solicitudesRechazadas ?? []),
      ...(activity.expulsados ?? []),
      ...(activity.salidas ?? []),
      ...(activity.chatSilenciados ?? []),
    ];

    const missingPhotoIds = [
      ...new Set(
        references
          .map((reference) => {
            const userId = getReferenceId(reference);
            if (!userId || getReferencePhotoUrl(reference) || profilePhotoUrls[userId]) return null;
            return userId;
          })
          .filter((userId): userId is string => Boolean(userId)),
      ),
    ];

    if (missingPhotoIds.length === 0) return;

    let isMounted = true;
    Promise.all(
      missingPhotoIds.map(async (userId) => {
        try {
          const profile = await fetchUserPublicProfile(userId, activityId);
          return profile.fotoPerfilUrl ? [userId, profile.fotoPerfilUrl] as const : null;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (!isMounted) return;
      const resolvedEntries = entries.filter((entry): entry is readonly [string, string] => Boolean(entry));
      if (resolvedEntries.length === 0) return;
      setProfilePhotoUrls((current) => ({
        ...current,
        ...Object.fromEntries(resolvedEntries),
      }));
    });

    return () => {
      isMounted = false;
    };
  }, [activity, activityId, currentUserId, profilePhotoUrls]);

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

  function renderPrivateChatButton(userId: string, label = 'Chat', unreadActorId = userId) {
    if (!activityId || !canUseChat || !currentUserId || (isCreator && userId === currentUserId)) return null;
    const hasUnread = unreadPrivateActorIds.has(unreadActorId);

    return (
      <Link
        className={`participant-chat-link${hasUnread ? ' participant-chat-link--unread' : ''}`}
        to={`/activities/${activityId}/private-chat/${userId}`}
        aria-label={`${label}${hasUnread ? ' con mensajes nuevos' : ''}`}
        title={label}
      >
        <ChatBubbleIcon />
        <span>{label}</span>
      </Link>
    );
  }

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
                {creatorId ? (
                  <>
                    <Link
                      className="participant-profile-link"
                      to={`/users/${creatorId}/profile?activityId=${activityId}`}
                    >
                      <span className="participant-row__info">
                        <strong>{getReferenceName(activity.creador)}</strong>
                        {isCreator && <span className="participant-badge">Tú</span>}
                      </span>
                      <ProfileAvatar reference={activity.creador} photoUrl={profilePhotoUrls[creatorId]} />
                    </Link>
                    {!isCreator && currentUserId && renderPrivateChatButton(currentUserId, 'Chat', creatorId)}
                  </>
                ) : (
                  <div className="participant-profile-link participant-profile-link--static">
                    <span className="participant-row__info">
                      <strong>{getReferenceName(activity.creador)}</strong>
                    </span>
                    <ProfileAvatar reference={activity.creador} />
                  </div>
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
                            <div className="participant-row participant-row--request" key={userId}>
                              <div className="participant-request-main">
                                <Link
                                  className="participant-profile-link"
                                  to={`/users/${userId}/profile?activityId=${activityId}`}
                                >
                                  <span className="participant-row__info">
                                    <strong>{getReferenceName(user)}</strong>
                                    <span className="participant-badge participant-badge--pending">Pendiente</span>
                                  </span>
                                  <ProfileAvatar reference={user} photoUrl={profilePhotoUrls[userId]} />
                                </Link>
                                {renderPrivateChatButton(userId)}
                              </div>
                              <div className="participant-actions">
                                <button
                                  className="button button--accept button--small"
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
                          <Link
                            className="participant-profile-link"
                            to={`/users/${participantId}/profile?activityId=${activityId}`}
                          >
                            <span className="participant-row__info">
                              <strong>{getReferenceName(participant)}</strong>
                              {isCurrentCreator && <span className="participant-badge">Tú · Organizador</span>}
                              {isMuted && <span className="participant-badge participant-badge--muted">Silenciado</span>}
                            </span>
                            <ProfileAvatar reference={participant} photoUrl={profilePhotoUrls[participantId]} />
                          </Link>
                          <div className="participant-actions">
                            {renderPrivateChatButton(participantId)}
                            {!isArchived && !isCurrentCreator && (
                              <div className="participant-more">
                                <button
                                  className="button button--ghost button--small"
                                  type="button"
                                  onClick={() => {
                                    setOpenParticipantMenuId((prev) => prev === participantId ? null : participantId);
                                  }}
                                >
                                  Más
                                </button>
                                {openParticipantMenuId === participantId && (
                                  <div className="participant-more__menu">
                                    <button
                                      className="button button--ghost button--small"
                                      type="button"
                                      disabled={mutingParticipantId === participantId}
                                      onClick={() => { handleToggleMute(participantId, isMuted); setOpenParticipantMenuId(null); }}
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
                                      onClick={() => { handleRemoveParticipant(participantId); setOpenParticipantMenuId(null); }}
                                    >
                                      {removingParticipantId === participantId ? 'Quitando...' : 'Quitar'}
                                    </button>
                                  </div>
                                )}
                              </div>
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
                            <Link
                              className="participant-profile-link"
                              to={`/users/${userId}/profile?activityId=${activityId}`}
                            >
                              <span className="participant-row__info">
                                <strong>{getReferenceName(user)}</strong>
                                <span className="participant-badge participant-badge--neutral">Se desapuntó</span>
                              </span>
                              <ProfileAvatar reference={user} photoUrl={profilePhotoUrls[userId]} />
                            </Link>
                            <div className="participant-actions">
                              {renderPrivateChatButton(userId)}
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
                            <Link
                              className="participant-profile-link"
                              to={`/users/${userId}/profile?activityId=${activityId}`}
                            >
                              <span className="participant-row__info">
                                <strong>{getReferenceName(user)}</strong>
                                <span className="participant-badge participant-badge--muted">Silenciado del chat</span>
                              </span>
                              <ProfileAvatar reference={user} photoUrl={profilePhotoUrls[userId]} />
                            </Link>
                            <div className="participant-actions">
                              {renderPrivateChatButton(userId)}
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
                            <Link
                              className="participant-profile-link"
                              to={`/users/${userId}/profile?activityId=${activityId}`}
                            >
                              <span className="participant-row__info">
                                <strong>{getReferenceName(user)}</strong>
                                <span className="participant-badge participant-badge--danger">Expulsado</span>
                              </span>
                              <ProfileAvatar reference={user} photoUrl={profilePhotoUrls[userId]} />
                            </Link>
                            <div className="participant-actions">
                              {renderPrivateChatButton(userId)}
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
                          <Link
                            className="participant-profile-link"
                            to={`/users/${participantId}/profile?activityId=${activityId}`}
                          >
                            <span className="participant-row__info">
                              <strong>{getReferenceName(participant)}</strong>
                            </span>
                            <ProfileAvatar reference={participant} photoUrl={profilePhotoUrls[participantId]} />
                          </Link>
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
                </>
              ) : isJoined ? (
                <>
                <p className="status-pill">{isCreator ? 'Eres el organizador' : 'Ya participas'}</p>
                  {!isCreator && (
                    <button className="button button--ghost" type="button" onClick={handleLeave} disabled={isLeaving}>
                      {isLeaving ? 'Saliendo...' : 'Desapuntarme'}
                    </button>
                  )}
                </>
              ) : isFull ? (
                <>
                  <p className="status-pill status-pill--danger">Actividad completa</p>
                </>
              ) : (
                <>
                  <button className="button button--primary" type="button" onClick={handleJoin} disabled={isJoining}>
                    {isJoining ? 'Solicitando...' : 'Solicitar plaza'}
                  </button>
                </>
              )}
              {!hasStarted && isCreator && activityId && (
                <Link className="button button--ghost detail-actions__primary" to={`/activities/${activityId}/edit`}>
                  Editar
                </Link>
              )}
              {canUseChat && activityId && (isCreator || isJoined) && (
                <Link
                  className={`button detail-actions__primary${hasUnreadGeneralMessages ? ' button--chat-unread' : ' button--secondary'}`}
                  to={`/activities/${activityId}/chat`}
                >
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
