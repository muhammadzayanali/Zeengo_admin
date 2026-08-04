import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type { EditRequest } from '@/shared/api/types';

export const editRequestsApi = {
  list(
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      type?: string;
      bookingId?: string;
    },
    signal?: AbortSignal,
  ) {
    return apiList<EditRequest>({ url: '/edit-requests', params: toQuery(params) }, signal);
  },
  get(id: string, signal?: AbortSignal) {
    return apiRequest<EditRequest>({ url: `/edit-requests/${id}` }, signal);
  },
  approve(id: string, reviewNotes?: string) {
    return apiRequest<EditRequest>({
      method: 'POST',
      url: `/edit-requests/${id}/approve`,
      data: { reviewNotes },
    });
  },
  reject(id: string, reviewNotes?: string) {
    return apiRequest<EditRequest>({
      method: 'POST',
      url: `/edit-requests/${id}/reject`,
      data: { reviewNotes },
    });
  },
};
