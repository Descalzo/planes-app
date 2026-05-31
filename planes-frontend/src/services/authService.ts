import { api } from './api';

export interface RegisterDto {
  email: string;
  nombre: string;
  contraseña: string;
  ciudad?: string;
  bio?: string;
  intereses?: string[];
}

export interface LoginDto {
  email: string;
  contraseña: string;
}

export interface AuthResponse {
  access_token: string;
  user: Record<string, unknown>;
}

export function registerUser(payload: RegisterDto) {
  return api.post<AuthResponse>('/users', payload);
}

export function loginUser(payload: LoginDto) {
  return api.post<AuthResponse>('/users/login', payload);
}

export function fetchCurrentUser() {
  return api.get('/users/me');
}
