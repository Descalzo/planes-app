import { api } from './api';

export interface MessageCreateDto {
  text: string;
}

export function fetchMessages(activityId: string) {
  return api.get(`/activities/${activityId}/messages`);
}

export function createMessage(activityId: string, payload: MessageCreateDto) {
  return api.post(`/activities/${activityId}/messages`, payload);
}
