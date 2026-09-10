import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type { SosAlert } from '@/shared/api/types';

export const sosApi = {
  list(
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      bookingId?: string;
    },
    signal?: AbortSignal,
  ) {
    return apiList<SosAlert>({ url: '/sos', params: toQuery(params) }, signal);
  },
  get(id: string, signal?: AbortSignal) {
    return apiRequest<SosAlert>({ url: `/sos/${id}` }, signal);
  },
  resolve(id: string) {
    return apiRequest<SosAlert>({ method: 'POST', url: `/sos/${id}/resolve` });
  },
};
