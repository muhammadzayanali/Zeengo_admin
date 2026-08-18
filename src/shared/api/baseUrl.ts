/** Single backend origin for the whole Ops app. REST uses `${baseUrl}/api/v1`, socket uses `${baseUrl}/ws`. */
const FALLBACK_BASE_URL = 'https://zeengobackend-production.up.railway.app';

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, '').replace(/\/api\/v1$/i, '');
}

export const baseUrl = normalizeOrigin(
  import.meta.env.VITE_API_BASE_URL || FALLBACK_BASE_URL,
);

export function getApiBaseUrl(): string {
  return `${baseUrl}/api/v1`;
}

export function getWsUrl(): string {
  return `${baseUrl}/ws`;
}
