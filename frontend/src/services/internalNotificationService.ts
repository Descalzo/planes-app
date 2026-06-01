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
  type: 'activity_request_created' | 'activity_request_accepted' | 'activity_request_rejected';
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
