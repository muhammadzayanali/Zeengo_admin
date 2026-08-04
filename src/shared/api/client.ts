import axios, { type AxiosRequestConfig } from 'axios';
import type { ApiErrorBody, ApiSuccess, PageMeta } from './types';

const ACCESS_KEY = 'zeengo_access_token';
const REFRESH_KEY = 'zeengo_refresh_token';

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string | null, refresh?: string | null) {
  if (access) sessionStorage.setItem(ACCESS_KEY, access);
  else sessionStorage.removeItem(ACCESS_KEY);
  if (refresh === undefined) return;
  if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh);
  else sessionStorage.removeItem(REFRESH_KEY);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<ApiSuccess<{ accessToken: string; refreshToken: string }>>(
      `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/refresh`,
      { refreshToken },
    );
    if (data.success) {
      setTokens(data.data.accessToken, data.data.refreshToken);
      return data.data.accessToken;
    }
  } catch {
    clearTokens();
  }
  return null;
}

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return http.request(original);
      }
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export async function apiRequest<T>(
  config: AxiosRequestConfig,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const response = await http.request<ApiSuccess<T> | ApiErrorBody | T>({
      ...config,
      signal: signal ?? config.signal,
    });
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'success' in payload) {
      const envelope = payload as ApiSuccess<T> | ApiErrorBody;
      if (envelope.success === true) return envelope.data;
      throw new ApiClientError(
        envelope.error?.message || 'Request failed',
        response.status,
        envelope.error?.code,
      );
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (axios.isAxiosError(error)) {
      if (error.code === 'ERR_CANCELED') throw error;
      const body = error.response?.data as ApiErrorBody | undefined;
      throw new ApiClientError(
        body?.error?.message || error.message || 'Request failed',
        error.response?.status ?? 500,
        body?.error?.code,
      );
    }
    throw error;
  }
}

/** List endpoints often return { success, data: T[], meta } — axios data is the envelope. */
export async function apiList<T>(
  config: AxiosRequestConfig,
  signal?: AbortSignal,
): Promise<{ data: T[]; meta: PageMeta }> {
  try {
    const response = await http.request<ApiSuccess<T[]>>({
      ...config,
      signal: signal ?? config.signal,
    });
    const payload = response.data;
    if (payload?.success) {
      return {
        data: payload.data ?? [],
        meta: payload.meta ?? { page: 1, limit: 20, total: payload.data?.length ?? 0 },
      };
    }
    throw new ApiClientError('Request failed', response.status);
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (axios.isAxiosError(error)) {
      const body = error.response?.data as ApiErrorBody | undefined;
      throw new ApiClientError(
        body?.error?.message || error.message || 'Request failed',
        error.response?.status ?? 500,
        body?.error?.code,
      );
    }
    throw error;
  }
}

export function toQuery(
  params?: Record<string, string | number | boolean | undefined | null>,
) {
  if (!params) return undefined;
  const query: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query[key] = value;
  }
  return query;
}
