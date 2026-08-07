import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type { EditRequest } from '@/shared/api/types';

export type EditRequestStatusFilter = 'pending' | 'approved' | 'rejected';

export type EditRequestStats = {
  pending: number;
  approved: number;
  rejected: number;
  all: number;
};

export const editRequestKeys = {
  all: ['edit-requests'] as const,
  stats: () => [...editRequestKeys.all, 'stats'] as const,
  lists: () => [...editRequestKeys.all, 'list'] as const,
  list: (params: {
    tab: string;
    page: number;
    search: string;
  }) => [...editRequestKeys.lists(), params] as const,
  details: () => [...editRequestKeys.all, 'detail'] as const,
  detail: (id: string) => [...editRequestKeys.details(), id] as const,
};

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
  stats(signal?: AbortSignal) {
    return apiRequest<EditRequestStats>({ url: '/edit-requests/stats' }, signal);
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
