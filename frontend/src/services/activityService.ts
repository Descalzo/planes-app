import { api } from './api';

export type EntityReference = string | { _id?: string; id?: string; nombre?: string; email?: string; ciudad?: string } | null | undefined;

export interface Activity {
  _id: string;
  titulo: string;
  descripcion?: string;
  categoria?: string;
  ciudad?: string;
  zonaPrincipal?: string;
  fecha?: string;
  estado?: 'activa' | 'finalizada';
  plazas?: number;
  plazasOcupadas?: number;
  plazasDisponibles?: number;
  imagenUrl?: string;
  participantes?: EntityReference[];
  solicitudesPendientes?: EntityReference[];
  solicitudesRechazadas?: EntityReference[];
  expulsados?: EntityReference[];
  salidas?: EntityReference[];
  chatSilenciados?: EntityReference[];
  guardadoPor?: string[];
  creador?: EntityReference;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityCreateDto {
  titulo: string;
  descripcion?: string;
  categoria?: string;
  ciudad?: string;
  zonaPrincipal?: string;
  fecha?: string;
  plazas?: number;
  imagenUrl?: string;
}

export interface ActivityUpdateDto {
  titulo?: string;
  descripcion?: string;
  categoria?: string;
  ciudad?: string;
  zonaPrincipal?: string;
  fecha?: string;
  plazas?: number;
  imagenUrl?: string;
}

export type ActivityStatusFilter = 'futuras' | 'pasadas' | 'todas';
export type ActivitySort = 'fechaAsc' | 'createdDesc' | 'createdAsc';

export interface ActivityFilters {
  categoria?: string;
  ciudad?: string;
  zonaPrincipal?: string;
  estado?: ActivityStatusFilter;
  sort?: ActivitySort;
  limit?: number;
}

export async function fetchActivities(filters: ActivityFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  );
  const response = await api.get<Activity[]>('/activities', { params });
  return response.data;
}

export async function fetchActivity(activityId: string) {
  const response = await api.get<Activity>(`/activities/${activityId}`);
  return response.data;
}

export async function createActivity(payload: ActivityCreateDto) {
  const response = await api.post<Activity>('/activities', payload);
  return response.data;
}

export async function updateActivity(activityId: string, payload: ActivityUpdateDto) {
  const response = await api.patch<Activity>(`/activities/${activityId}`, payload);
  return response.data;
}

export async function joinActivity(activityId: string) {
  const response = await api.patch<Activity>(`/activities/${activityId}/join`, {});
  return response.data;
}

export async function acceptActivityRequest(activityId: string, userId: string) {
  const response = await api.patch<Activity>(`/activities/${activityId}/requests/${userId}/accept`, {});
  return response.data;
}

export async function rejectActivityRequest(activityId: string, userId: string) {
  const response = await api.patch<Activity>(`/activities/${activityId}/requests/${userId}/reject`, {});
  return response.data;
}

export async function leaveActivity(activityId: string) {
  const response = await api.patch<Activity>(`/activities/${activityId}/leave`, {});
  return response.data;
}

export async function removeActivityParticipant(activityId: string, participantId: string) {
  const response = await api.patch<Activity>(`/activities/${activityId}/participants/${participantId}/remove`, {});
  return response.data;
}

export async function unbanActivityParticipant(activityId: string, participantId: string) {
  const response = await api.patch<Activity>(`/activities/${activityId}/participants/${participantId}/unban`, {});
  return response.data;
}

export async function muteActivityParticipant(activityId: string, participantId: string) {
  const response = await api.patch<Activity>(`/activities/${activityId}/participants/${participantId}/mute`, {});
  return response.data;
}

export async function unmuteActivityParticipant(activityId: string, participantId: string) {
  const response = await api.patch<Activity>(`/activities/${activityId}/participants/${participantId}/unmute`, {});
  return response.data;
}

export async function saveActivity(activityId: string) {
  await api.patch(`/activities/${activityId}/save`, {});
}

export async function unsaveActivity(activityId: string) {
  await api.patch(`/activities/${activityId}/unsave`, {});
}

export async function fetchSavedActivities() {
  const response = await api.get<Activity[]>('/activities/saved');
  return response.data;
}

export async function fetchRequestedActivities() {
  const response = await api.get<Activity[]>('/users/me/requested-activities');
  return response.data;
}

export function isActivitySavedByUser(activity: Activity, userId: string | null | undefined) {
  if (!userId || !activity.guardadoPor) return false;
  return activity.guardadoPor.some((id) => {
    const refId = typeof id === 'string' ? id : (id as any)?._id ?? (id as any)?.id ?? id;
    return refId === userId;
  });
}

export function getReferenceId(reference: EntityReference) {
  if (!reference) {
    return null;
  }

  if (typeof reference === 'string') {
    return reference;
  }

  return reference._id ?? reference.id ?? null;
}

export function getReferenceName(reference: EntityReference) {
  if (!reference || typeof reference === 'string') {
    return 'Usuario';
  }

  return reference.nombre ?? reference.email ?? 'Usuario';
}

export function isActivityParticipant(activity: Activity, userId: string) {
  return activity.participantes?.some((participant) => getReferenceId(participant) === userId) ?? false;
}

export function isActivityCreator(activity: Activity, userId: string) {
  return getReferenceId(activity.creador) === userId;
}

export function isUserInActivity(activity: Activity, userId: string) {
  return isActivityCreator(activity, userId) || isActivityParticipant(activity, userId);
}

export function isUserPendingInActivity(activity: Activity, userId: string) {
  return activity.solicitudesPendientes?.some((user) => getReferenceId(user) === userId) ?? false;
}

export function isUserRejectedFromActivity(activity: Activity, userId: string) {
  return activity.solicitudesRechazadas?.some((user) => getReferenceId(user) === userId) ?? false;
}

export function isUserRemovedFromActivity(activity: Activity, userId: string) {
  return activity.expulsados?.some((user) => getReferenceId(user) === userId) ?? false;
}

export function isUserMutedInActivity(activity: Activity, userId: string) {
  return activity.chatSilenciados?.some((user) => getReferenceId(user) === userId) ?? false;
}

export function getActivityParticipantsCount(activity: Activity, currentUserId?: string | null) {
  const participantIds = new Set(
    activity.participantes?.map((participant) => getReferenceId(participant)).filter(Boolean) ?? [],
  );
  const creatorId = getReferenceId(activity.creador);

  if (creatorId) {
    participantIds.add(creatorId);
  }

  if (currentUserId && isActivityCreator(activity, currentUserId)) {
    participantIds.add(currentUserId);
  }

  return participantIds.size;
}
