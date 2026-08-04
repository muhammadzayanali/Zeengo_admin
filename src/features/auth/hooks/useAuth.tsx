import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/services/auth.api';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/shared/api/client';
import type { StaffRole, StaffUser } from '@/shared/api/types';

interface AuthContextValue {
  user: StaffUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<StaffUser>;
  logout: () => Promise<void>;
  hasRole: (...roles: StaffRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getAccessToken());

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const result = await authApi.me();
      if (result.type !== 'staff') throw new Error('Staff access required');
      return result.user;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.staffLogin(email, password);
      setTokens(result.accessToken, result.refreshToken);
      setToken(result.accessToken);
      queryClient.setQueryData(['auth', 'me'], result.user);
      return result.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) await authApi.logout(refresh);
    } catch {
      /* ignore */
    }
    clearTokens();
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const user = token ? (meQuery.data ?? null) : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: Boolean(token) && meQuery.isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
    }),
    [user, token, meQuery.isLoading, login, logout],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
