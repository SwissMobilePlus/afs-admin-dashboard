import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Ensure the base URL always ends with /api/v1
const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'https://afs-api-production.up.railway.app';
const API_BASE_URL = rawUrl.endsWith('/api/v1')
  ? rawUrl
  : `${rawUrl.replace(/\/+$/, '')}/api/v1`;

// Callback for auth invalidation (set by auth store to avoid circular deps)
let onAuthInvalidated: (() => void) | null = null;

export function setAuthInvalidatedCallback(callback: () => void) {
  onAuthInvalidated = callback;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('afs_admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 by clearing tokens and notifying auth store
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('afs_admin_token');
        localStorage.removeItem('afs_admin_refresh_token');
        // Notify auth store to update state — AdminLayout will handle redirect via React router
        onAuthInvalidated?.();
      }
    }
    return Promise.reject(error);
  }
);

// ── Generic typed request helpers ─────────────────────────────────────

export async function get<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await api.get(url, config);
  return response.data;
}

export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await api.post(url, data, config);
  return response.data;
}

export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await api.patch(url, data, config);
  return response.data;
}

export async function del<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await api.delete(url, config);
  return response.data;
}

export default api;
