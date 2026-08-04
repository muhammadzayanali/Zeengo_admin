import { apiRequest } from '@/shared/api/client';
import type { AuthTokens, StaffUser } from '@/shared/api/types';

export const authApi = {
  staffLogin(email: string, password: string) {
    return apiRequest<AuthTokens>({
      method: 'POST',
      url: '/auth/staff/login',
      data: { email, password },
    });
  },
  me() {
    return apiRequest<{ type: string; user: StaffUser }>({
      method: 'GET',
      url: '/auth/me',
    });
  },
  logout(refreshToken: string) {
    return apiRequest({
      method: 'POST',
      url: '/auth/logout',
      data: { refreshToken },
    });
  },
};
