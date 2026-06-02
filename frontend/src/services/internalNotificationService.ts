import { api } from './api';
import { EntityReference } from './activityService';

export interface InternalNotification {
  _id: string;
  recipient: EntityReference;
  actor?: EntityReference;
  activity?: string | {
    _id?: string;
    id?: string;
    titulo?: string;
    ciudad?: string;
    fecha?: string;
  };
  type: 'activity_request_created' | 'activity_request_accepted' | 'activity_request_rejected' | 'activity_participant_left' | 'activity_participant_removed' | 'activity_participant_unbanned' | 'private_activity_message' | 'general_chat_message';
  message: string;
  readAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchNotifications() {
  const response = await api.get<InternalNotification[]>('/notifications');
  return response.data;
}

export async function fetchUnreadNotificationsCount() {
  const response = await api.get<{ count: number }>('/notifications/unread-count');
  return response.data.count;
}

export async function markNotificationAsRead(notificationId: string) {
  const response = await api.patch<InternalNotification>(`/notifications/${notificationId}/read`, {});
  return response.data;
}

export async function fetchUnreadMessagesCount() {
  const response = await api.get<{ count: number }>('/notifications/unread-messages-count');
  return response.data.count;
}

export async function fetchUnreadMessageActivityIds() {
  const response = await api.get<{ activityIds: string[] }>('/notifications/unread-message-activity-ids');
  return response.data.activityIds;
}

export async function fetchUnreadPrivateMessageActorIds(activityId: string) {
  const response = await api.get<{ actorIds: string[] }>(`/notifications/unread-private-message-actor-ids/${activityId}`);
  return response.data.actorIds;
}

export async function markMessagesReadByActivity(activityId: string) {
  await api.patch(`/notifications/messages/read-by-activity/${activityId}`, {});
}

export async function markAllStatusRead() {
  await api.patch('/notifications/status/mark-all-read', {});
}
