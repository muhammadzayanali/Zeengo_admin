import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/modules/admin/users/services/users.api';
import {
  Button,
  EmptyState,
  ErrorState,
  PageScaffold,
  Skeleton,
  StatusBadge,
} from '@/shared/ui';
import { ROLE_NAV_PATHS, ROLE_PERMISSIONS } from '@/modules/auth/permissions';
import type { StaffRole, StaffUser } from '@/shared/api/types';

const STAFF_ROLES: StaffRole[] = ['admin', 'ops_manager', 'support', 'driver', 'splizer'];

export function RolesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: ({ signal }) => usersApi.list(undefined, signal),
  });
  const statsQuery = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: ({ signal }) => usersApi.stats(signal),
  });

  const grouped = useMemo(() => {
    const map: Record<StaffRole, StaffUser[]> = {
      admin: [],
      ops_manager: [],
      support: [],
      driver: [],
      splizer: [],
    };
    for (const u of usersQuery.data ?? []) {
      if (map[u.role]) map[u.role].push(u);
    }
    return map;
  }, [usersQuery.data]);

  return (
    <PageScaffold
      title={t('rolesPage.title')}
      description={t('rolesPage.description')}
      primaryAction={
        <Button type="button" variant="secondary" onClick={() => navigate('/users')}>
          {t('rolesPage.manageUsers')}
        </Button>
      }
    >
      {usersQuery.isLoading || statsQuery.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : usersQuery.isError ? (
        <ErrorState title={t('users.loadFailed')} onRetry={() => void usersQuery.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STAFF_ROLES.map((role) => (
              <div
                key={role}
                className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]"
              >
                <p className="text-xs uppercase text-[var(--ink-muted)]">{t(`roles.${role}`)}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {statsQuery.data?.byRole?.[role] ?? grouped[role].length}
                </p>
              </div>
            ))}
          </div>

          {STAFF_ROLES.map((role) => (
            <section
              key={role}
              className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]"
            >
              <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">
                {t(`roles.${role}`)}
                <span className="ms-2 text-xs font-normal text-[var(--ink-muted)]">
                  {ROLE_NAV_PATHS[role] === '*'
                    ? t('rolesPage.allScreens')
                    : `${ROLE_NAV_PATHS[role].length} ${t('rolesPage.screens')}`}
                </span>
              </div>
              {grouped[role].length === 0 ? (
                <div className="p-4">
                  <EmptyState title={t('rolesPage.noStaff')} />
                </div>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {grouped[role].map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <div>
                        <p className="font-medium">{u.fullName}</p>
                        <p className="text-xs text-[var(--ink-muted)]">{u.email}</p>
                      </div>
                      <StatusBadge tone={u.isActive ? 'success' : 'default'}>
                        {u.isActive ? t('common.active') : t('users.inactive')}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
            <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">
              {t('rolesPage.matrix')}
            </div>
            <p className="px-4 py-2 text-xs text-[var(--ink-muted)]">{t('rolesPage.matrixHint')}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--ink-muted)]">
                  <tr>
                    <th className="px-4 py-2 text-start">{t('rolesPage.feature')}</th>
                    {STAFF_ROLES.map((r) => (
                      <th key={r} className="px-3 py-2 text-center">
                        {t(`roles.${r}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ROLE_PERMISSIONS).map(([feature, roles]) => (
                    <tr key={feature} className="border-t border-[var(--line)]">
                      <td className="px-4 py-2 font-medium">{feature}</td>
                      {STAFF_ROLES.map((r) => (
                        <td key={r} className="px-3 py-2 text-center">
                          {(roles as readonly string[]).includes(r) ? '✓' : '✕'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
