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
import { authApi } from '@/modules/auth/services/auth.api';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/shared/api/client';
import type { StaffRole, StaffUser } from '@/shared/api/types';
import {
  canAccessPath,
  canSeeNavPath,
  homeForRole,
  normalizeStaffRole,
  ROLE_PERMISSIONS,
  type PermissionKey,
} from '@/modules/auth/permissions';

interface AuthContextValue {
  user: StaffUser | null;
  role: StaffRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<StaffUser>;
  logout: () => Promise<void>;
  hasRole: (...roles: StaffRole[]) => boolean;
  can: (permission: PermissionKey) => boolean;
  canAccess: (pathname: string) => boolean;
  canSeeNav: (path: string) => boolean;
  homePath: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function withNormalizedRole(user: StaffUser | null): StaffUser | null {
  if (!user) return null;
  const role = normalizeStaffRole(user.role);
  if (!role || role === user.role) return user;
  return { ...user, role };
}

/** Staff auth: always uses Nest API (no static client demo login). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getAccessToken());

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const result = await authApi.me();
      if (result.type !== 'staff') throw new Error('Staff access required');
      return withNormalizedRole(result.user) as StaffUser;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      queryClient.removeQueries({ queryKey: ['auth', 'me'] });
      const result = await authApi.staffLogin(email.trim().toLowerCase(), password);
      const user = withNormalizedRole(result.user) as StaffUser;
      setTokens(result.accessToken, result.refreshToken);
      setToken(result.accessToken);
      queryClient.setQueryData(['auth', 'me'], user);
      return user;
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

  const user = token ? withNormalizedRole(meQuery.data ?? null) : null;
  const role = normalizeStaffRole(user?.role);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      isLoading: Boolean(token) && (meQuery.isLoading || meQuery.isFetching) && !user,
      isAuthenticated: Boolean(user && role),
      login,
      logout,
      hasRole: (...roles) => Boolean(role && roles.includes(role)),
      can: (permission) => {
        if (!role) return false;
        if (role === 'admin') return true;
        return ROLE_PERMISSIONS[permission].includes(role);
      },
      canAccess: (pathname) => canAccessPath(role, pathname),
      canSeeNav: (path) => canSeeNavPath(role, path),
      homePath: homeForRole(role),
    }),
    [user, role, token, meQuery.isLoading, meQuery.isFetching, login, logout],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
