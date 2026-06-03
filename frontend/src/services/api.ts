import axios from 'axios';

function getDefaultApiBaseUrl() {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return '';
  }

  return `${window.location.protocol}//${window.location.hostname}:3000`;
}

const baseURL = import.meta.env.VITE_API_URL ?? getDefaultApiBaseUrl();
export const AUTH_TOKEN_KEY = 'planes_jwt';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

setAuthToken(getAuthToken());

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      setAuthToken(null);
      window.dispatchEvent(new Event('planes:auth-expired'));
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);
