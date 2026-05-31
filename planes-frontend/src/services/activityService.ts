import { api } from './api';

export interface ActivityCreateDto {
  titulo: string;
  descripcion?: string;
  categoria?: string;
  ciudad?: string;
  fecha?: string;
  plazas?: number;
}

export function fetchActivities() {
  return api.get('/activities');
}

export function fetchActivity(activityId: string) {
  return api.get(`/activities/${activityId}`);
}

export function createActivity(payload: ActivityCreateDto) {
  return api.post('/activities', payload);
}

export function joinActivity(activityId: string) {
  return api.patch(`/activities/${activityId}/join`, {});
}
