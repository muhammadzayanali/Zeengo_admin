import { apiRequest } from '@/shared/api/client';
import type { Setting } from '@/shared/api/types';

export const settingsApi = {
  list(signal?: AbortSignal) {
    return apiRequest<Setting[]>({ url: '/settings' }, signal);
  },
  get(key: string, signal?: AbortSignal) {
    return apiRequest<Setting>({ url: `/settings/${key}` }, signal);
  },
  put(key: string, value: unknown) {
    return apiRequest<Setting>({ method: 'PUT', url: `/settings/${key}`, data: { value } });
  },
};
