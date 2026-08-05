import type { AuthTokens, StaffRole, StaffUser } from '@/shared/api/types';
import { DEMO_STAFF_ACCOUNTS } from '@/features/auth/permissions';
import { ApiClientError } from '@/shared/api/client';

/** Client-demo mode: auth is local only (no API). Flip to false when backend login is ready. */
export const USE_STATIC_AUTH = true;

const STATIC_USER_KEY = 'zeengo_static_user';
const STATIC_TOKEN_PREFIX = 'static.';

const DISPLAY: Record<StaffRole, { fullName: string; id: string }> = {
  admin: { fullName: 'Zeengo Admin', id: 'static-admin' },
  ops_manager: { fullName: 'Ops Manager', id: 'static-ops' },
  splizer: { fullName: 'Splizer User', id: 'static-splizer' },
  driver: { fullName: 'Demo Driver', id: 'static-driver' },
  support: { fullName: 'Support Agent', id: 'static-support' },
};

function buildUser(email: string, role: StaffRole): StaffUser {
  const now = new Date().toISOString();
  const meta = DISPLAY[role];
  return {
    id: meta.id,
    fullName: meta.fullName,
    email,
    phone: null,
    role,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function isStaticToken(token: string | null | undefined): boolean {
  return Boolean(token?.startsWith(STATIC_TOKEN_PREFIX));
}

export function staffLoginStatic(email: string, password: string): AuthTokens {
  const normalized = email.trim().toLowerCase();
  const account = DEMO_STAFF_ACCOUNTS.find(
    (a) => a.email === normalized && a.password === password,
  );

  if (!account) {
    throw new ApiClientError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  const user = buildUser(account.email, account.role);
  const accessToken = `${STATIC_TOKEN_PREFIX}${account.role}.${Date.now()}`;
  const refreshToken = `${STATIC_TOKEN_PREFIX}refresh.${account.role}`;

  try {
    sessionStorage.setItem(STATIC_USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }

  return { accessToken, refreshToken, user };
}

export function meStatic(): { type: 'staff'; user: StaffUser } {
  try {
    const raw = sessionStorage.getItem(STATIC_USER_KEY);
    if (!raw) {
      throw new ApiClientError('Session expired', 401, 'UNAUTHORIZED');
    }
    const user = JSON.parse(raw) as StaffUser;
    return { type: 'staff', user };
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError('Session expired', 401, 'UNAUTHORIZED');
  }
}

export function clearStaticUser() {
  try {
    sessionStorage.removeItem(STATIC_USER_KEY);
  } catch {
    /* ignore */
  }
}
