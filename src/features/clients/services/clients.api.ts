import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type { Client } from '@/shared/api/types';

export const clientsApi = {
  list(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<Client>({ url: '/clients', params: toQuery(params) }, signal);
  },
  get(id: string, signal?: AbortSignal) {
    return apiRequest<Client>({ url: `/clients/${id}` }, signal);
  },
  update(id: string, data: Record<string, unknown>) {
    return apiRequest<Client>({ method: 'PATCH', url: `/clients/${id}`, data });
  },
};
