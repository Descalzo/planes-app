import { api, setAuthToken } from './api';

export interface RegisterDto {
  email: string;
  nombre: string;
  'contraseña': string;
  ciudad?: string;
  bio?: string;
  intereses?: string[];
}

export interface LoginDto {
  email: string;
  'contraseña': string;
}

export interface AuthResponse {
  access_token: string;
  user: Record<string, unknown>;
}

export interface CurrentUser {
  _id: string;
  id?: string;
  email: string;
  nombre: string;
  ciudad?: string;
  bio?: string;
  intereses?: string[];
  fotoPerfilUrl?: string;
  edad?: number | null;
  genero?: string;
  instagram?: string;
  createdAt?: string;
  updatedAt?: string;
  stats?: {
    actividadesCreadas: number;
    actividadesParticipadas: number;
    miembroDesde?: string;
    perfilCompleto: boolean;
    logros: string[];
  };
}

export interface UpdateProfileDto {
  nombre?: string;
  ciudad?: string;
  bio?: string;
  intereses?: string[];
  fotoPerfilUrl?: string;
  edad?: number | null;
  genero?: string;
  instagram?: string;
}

export function registerUser(payload: RegisterDto) {
  return api.post('/users', payload);
}

export function loginUser(payload: LoginDto) {
  return api.post<AuthResponse>('/users/login', payload);
}

export async function fetchCurrentUser() {
  const response = await api.get<CurrentUser>('/users/me');
  return response.data;
}

export async function updateCurrentUser(payload: UpdateProfileDto) {
  const response = await api.patch<CurrentUser>('/users/me', payload);
  return response.data;
}

export async function fetchUserPublicProfile(userId: string, activityId?: string) {
  const response = await api.get<CurrentUser>(`/users/${userId}/public`, {
    params: { activityId },
  });
  return response.data;
}

export async function authenticate(payload: LoginDto) {
  const response = await loginUser(payload);
  setAuthToken(response.data.access_token);
  return response.data;
}

export async function registerAndAuthenticate(payload: RegisterDto) {
  await registerUser(payload);
  return authenticate({
    email: payload.email,
    'contraseña': payload['contraseña'],
  });
}
