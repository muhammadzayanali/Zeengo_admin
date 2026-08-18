import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type { Task } from '@/shared/api/types';

export const tasksApi = {
  list(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<Task>({ url: '/tasks', params: toQuery(params) }, signal);
  },
  create(data: Record<string, unknown>) {
    return apiRequest<Task>({ method: 'POST', url: '/tasks', data });
  },
  update(id: string, data: Record<string, unknown>) {
    return apiRequest<Task>({ method: 'PATCH', url: `/tasks/${id}`, data });
  },
  complete(id: string) {
    return apiRequest({ method: 'POST', url: `/tasks/${id}/complete` });
  },
};
