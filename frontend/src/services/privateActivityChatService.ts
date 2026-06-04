import { api } from './api';
import { EntityReference } from './activityService';

export interface PrivateActivityMessage {
  _id: string;
  activity: string;
  sender: EntityReference;
  receiver: EntityReference;
  text: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrivateActivityConversation {
  user: EntityReference;
  lastMessage: PrivateActivityMessage;
}

export async function fetchPrivateActivityConversations(activityId: string) {
  const response = await api.get<PrivateActivityConversation[]>(`/activities/${activityId}/private-chat`);
  return response.data;
}

export async function fetchPrivateActivityMessages(activityId: string, userId: string) {
  const response = await api.get<PrivateActivityMessage[]>(`/activities/${activityId}/private-chat/${userId}`);
  return response.data;
}

export async function sendPrivateActivityMessage(activityId: string, text: string, receiverId?: string) {
  const response = await api.post<PrivateActivityMessage>(`/activities/${activityId}/private-chat`, {
    text,
    receiverId,
  });
  return response.data;
}

export async function markPrivateActivityConversationActive(activityId: string, userId: string) {
  const response = await api.patch<{ ok: boolean }>(`/activities/${activityId}/private-chat/${userId}/active`, {});
  return response.data;
}

export async function markPrivateActivityConversationInactive(activityId: string, userId: string) {
  const response = await api.patch<{ ok: boolean }>(`/activities/${activityId}/private-chat/${userId}/inactive`, {});
  return response.data;
}
