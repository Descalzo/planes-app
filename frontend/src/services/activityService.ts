import { api } from './api';

export interface Activity {
  _id: string;
  titulo: string;
  descripcion?: string;
  categoria?: string;
  ciudad?: string;
  fecha?: string;
  plazas?: number;
  participantes?: string[];
  creador?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityCreateDto {
  titulo: string;
  descripcion?: string;
  categoria?: string;
  ciudad?: string;
  fecha?: string;
  plazas?: number;
}

export async function fetchActivities() {
  const response = await api.get<Activity[]>('/activities');
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

export async function joinActivity(activityId: string) {
  const response = await api.patch<Activity>(`/activities/${activityId}/join`, {});
  return response.data;
}
