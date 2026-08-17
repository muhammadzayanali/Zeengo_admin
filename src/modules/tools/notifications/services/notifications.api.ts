import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type { AppNotification } from '@/shared/api/types';

function withReadState(notification: AppNotification): AppNotification {
  return {
    ...notification,
    isRead: Boolean(notification.isRead || notification.readAt),
  };
}

export const notificationsApi = {
  async list(params?: { page?: number; limit?: number; filter?: string }, signal?: AbortSignal) {
    const result = await apiList<AppNotification>(
      { url: '/notifications', params: toQuery(params) },
      signal,
    );
    return { ...result, data: result.data.map(withReadState) };
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
