/**
 * Backend origin for Ops.
 * DEV → VITE_API_BASE_URL_LOCAL · build/prod → VITE_API_BASE_URL_PRODUCTION
 * REST: `${baseUrl}/api/v1` · socket: `${baseUrl}/ws`
 */
const FALLBACK_LOCAL = 'http://localhost:3000';
const FALLBACK_PRODUCTION =
  'https://zeengobackend-production-d058.up.railway.app';

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, '').replace(/\/api\/v1$/i, '');
}

function resolveOrigin(): string {
  const local = import.meta.env.VITE_API_BASE_URL_LOCAL?.trim() || '';
  const production = import.meta.env.VITE_API_BASE_URL_PRODUCTION?.trim() || '';
  const picked = import.meta.env.DEV
    ? local || FALLBACK_LOCAL
    : production || FALLBACK_PRODUCTION;
  return normalizeOrigin(picked);
}

export const baseUrl = resolveOrigin();

export function getApiBaseUrl(): string {
  return `${baseUrl}/api/v1`;
}

export function getWsUrl(): string {
  return `${baseUrl}/ws`;
}
