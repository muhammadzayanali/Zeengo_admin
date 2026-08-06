import type { StaffRole } from '@/shared/api/types';

/**
 * Staff RBAC — single source of truth.
 * Sidebar + route guards both use ROLE_NAV_PATHS (allowlist).
 */
export const ROLE_PERMISSIONS = {
  dashboard: ['admin', 'ops_manager'] as StaffRole[],
  operationsRoom: ['admin', 'ops_manager'] as StaffRole[],
  clients: ['admin', 'ops_manager', 'support'] as StaffRole[],
  drivers: ['admin', 'ops_manager', 'driver'] as StaffRole[],
  splizer: ['admin', 'ops_manager', 'splizer'] as StaffRole[],
  finance: ['admin', 'ops_manager'] as StaffRole[],
  vendors: ['admin', 'ops_manager', 'support'] as StaffRole[],
  editRequests: ['admin', 'ops_manager', 'support'] as StaffRole[],
  /** Shown to every staff role */
  teamChat: ['admin', 'ops_manager', 'splizer', 'driver', 'support'] as StaffRole[],
  russiaChatbot: ['admin', 'ops_manager', 'splizer', 'driver', 'support'] as StaffRole[],
  aiFeatures: ['admin', 'ops_manager'] as StaffRole[],
  packages: ['admin', 'ops_manager'] as StaffRole[],
  settings: ['admin'] as StaffRole[],
  bookings: ['admin', 'ops_manager', 'support'] as StaffRole[],
  vip: ['admin', 'ops_manager', 'support'] as StaffRole[],
  dailyOps: ['admin', 'ops_manager'] as StaffRole[],
  sos: ['admin', 'ops_manager', 'support'] as StaffRole[],
  tasks: ['admin', 'ops_manager'] as StaffRole[],
  payments: ['admin', 'ops_manager'] as StaffRole[],
  notifications: ['admin', 'ops_manager', 'splizer', 'driver', 'support'] as StaffRole[],
  email: ['admin', 'ops_manager', 'support'] as StaffRole[],
  users: ['admin'] as StaffRole[],
  guides: ['admin', 'ops_manager'] as StaffRole[],
  driverMe: ['driver'] as StaffRole[],
} as const;

export type PermissionKey = keyof typeof ROLE_PERMISSIONS;

/**
 * Exact sidebar paths each role may open.
 * Admin is unrestricted (all NAV items).
 * Splizer: Splizer + Team Chat + Notifications only — no Clients section.
 */
export const ROLE_NAV_PATHS: Record<StaffRole, readonly string[] | '*'> = {
  admin: '*',
  ops_manager: [
    '/',
    '/dashboard',
    '/operations-room',
    '/operations',
    '/daily-ops',
    '/sos',
    '/tasks',
    '/bookings',
    '/clients',
    '/edit-requests',
    '/vip',
    '/zeen-rafeq',
    '/drivers',
    '/guides',
    '/vendors',
    '/finance',
    '/payments',
    '/packages',
    '/splizer',
    '/chat',
    '/notifications',
    '/ai-parser',
    '/russia-chatbot',
    '/ai',
    '/email',
  ],
  splizer: ['/splizer', '/chat', '/russia-chatbot', '/notifications'],
  driver: ['/drivers', '/driver/me', '/chat', '/russia-chatbot', '/notifications'],
  support: [
    '/sos',
    '/bookings',
    '/clients',
    '/edit-requests',
    '/vip',
    '/zeen-rafeq',
    '/vendors',
    '/chat',
    '/russia-chatbot',
    '/notifications',
    '/email',
  ],
};

export function normalizeStaffRole(role: unknown): StaffRole | null {
  if (typeof role !== 'string') return null;
  const r = role.trim().toLowerCase().replace(/\s+/g, '_');
  if (
    r === 'admin' ||
    r === 'ops_manager' ||
    r === 'splizer' ||
    r === 'driver' ||
    r === 'support'
  ) {
    return r;
  }
  return null;
}

/** Sidebar: is this exact nav `to` visible for the role? */
export function canSeeNavPath(role: StaffRole | undefined | null, to: string): boolean {
  const r = normalizeStaffRole(role);
  if (!r) return false;
  const allow = ROLE_NAV_PATHS[r];
  if (allow === '*') return true;
  return allow.includes(to);
}

/** Route guard: can this role open this URL? */
export function canAccessPath(role: StaffRole | undefined | null, pathname: string): boolean {
  const r = normalizeStaffRole(role);
  if (!r) return false;
  const allow = ROLE_NAV_PATHS[r];
  if (allow === '*') return true;

  // Exact first, then prefix (e.g. /bookings/xyz)
  if (allow.includes(pathname)) return true;
  if (pathname === '/dashboard' && allow.includes('/')) return true;

  return allow.some((p) => {
    if (p === '/') return pathname === '/' || pathname === '';
    return pathname === p || pathname.startsWith(`${p}/`);
  });
}

export function homeForRole(role: StaffRole | undefined | null): string {
  const r = normalizeStaffRole(role);
  switch (r) {
    case 'admin':
    case 'ops_manager':
      return '/';
    case 'splizer':
      return '/splizer';
    case 'driver':
      return '/drivers';
    case 'support':
      return '/clients';
    default:
      return '/login';
  }
}

export const DEMO_STAFF_ACCOUNTS: Array<{
  email: string;
  password: string;
  role: StaffRole;
  label: string;
}> = [
  { email: 'admin@zeengo.com', password: '1234567', role: 'admin', label: 'Admin' },
  { email: 'ops@zeengo.com', password: '1234567', role: 'ops_manager', label: 'Ops Mgr' },
  { email: 'splizer@zeengo.com', password: '1234567', role: 'splizer', label: 'Splizer' },
  { email: 'driver@zeengo.com', password: '1234567', role: 'driver', label: 'Driver' },
  { email: 'support@zeengo.com', password: '1234567', role: 'support', label: 'Support' },
];
