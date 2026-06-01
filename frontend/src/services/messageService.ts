import { api } from './api';

export interface MessageAuthor {
  _id?: string;
  id?: string;
  nombre?: string;
  ciudad?: string;
}

export interface Message {
  _id: string;
  activity: string;
  author?: string | MessageAuthor;
  text: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageCreateDto {
  text: string;
}

export async function fetchMessages(activityId: string) {
  const response = await api.get<Message[]>(`/activities/${activityId}/messages`);
  return response.data;
}

export async function createMessage(activityId: string, payload: MessageCreateDto) {
  const response = await api.post<Message>(`/activities/${activityId}/messages`, payload);
  return response.data;
}

export async function markGeneralChatActive(activityId: string) {
  await api.patch(`/activities/${activityId}/messages/active`, {});
}
