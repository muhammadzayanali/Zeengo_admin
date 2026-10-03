/**
 * Backend origin for Ops.
 * DEV → VITE_API_BASE_URL_LOCAL · build/prod → VITE_API_BASE_URL_PRODUCTION
 * REST: `${baseUrl}/api/v1` · socket: `${baseUrl}/ws`
 */
const FALLBACK_PRODUCTION =
  'https://zeengobackend-production-d058.up.railway.app';

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, '').replace(/\/api\/v1$/i, '');
}

function resolveOrigin(): string {
  if (import.meta.env.DEV) {
    const local = import.meta.env.VITE_API_BASE_URL_LOCAL?.trim() || '';
    return normalizeOrigin(local || 'http://localhost:3000');
  }
  const production = import.meta.env.VITE_API_BASE_URL_PRODUCTION?.trim() || '';
  return normalizeOrigin(production || FALLBACK_PRODUCTION);
}

export const baseUrl = resolveOrigin();

export function getApiBaseUrl(): string {
  return `${baseUrl}/api/v1`;
}

export function getWsUrl(): string {
  return `${baseUrl}/ws`;
}
