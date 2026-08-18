import { apiRequest, toQuery } from '@/shared/api/client';
import type { StaffRole, StaffStats, StaffUser } from '@/shared/api/types';

export interface CreateStaffInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: StaffRole;
  avatarUrl?: string;
  isActive?: boolean;
}

export interface UpdateStaffInput {
  fullName?: string;
  email?: string;
  phone?: string | null;
  role?: StaffRole;
  avatarUrl?: string | null;
  isActive?: boolean;
}

export const usersApi = {
  list(role?: StaffRole, signal?: AbortSignal) {
    return apiRequest<StaffUser[]>({ url: '/users', params: toQuery({ role }) }, signal);
  },
  stats(signal?: AbortSignal) {
    return apiRequest<StaffStats>({ url: '/users/stats' }, signal);
  },
  create(data: CreateStaffInput) {
    return apiRequest<StaffUser>({ method: 'POST', url: '/users', data });
  },
  update(id: string, data: UpdateStaffInput) {
    return apiRequest<StaffUser>({ method: 'PATCH', url: `/users/${id}`, data });
  },
  resetPassword(id: string, password: string) {
    return apiRequest<{ message: string }>({
      method: 'POST',
      url: `/users/${id}/reset-password`,
      data: { password },
    });
  },
};
