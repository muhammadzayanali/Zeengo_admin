import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type { AppNotification } from '@/shared/api/types';

export const notificationsApi = {
  list(params?: { page?: number; limit?: number; filter?: string }, signal?: AbortSignal) {
    return apiList<AppNotification>(
      { url: '/notifications', params: toQuery(params) },
      signal,
    );
  },
  unreadCount(signal?: AbortSignal) {
    return apiRequest<{ count: number }>(
      { url: '/notifications/unread-count' },
      signal,
    );
  },
  markRead(id: string) {
    return apiRequest({ method: 'POST', url: `/notifications/${id}/read` });
  },
  markAllRead() {
    return apiRequest({ method: 'POST', url: '/notifications/read-all' });
  },
};
