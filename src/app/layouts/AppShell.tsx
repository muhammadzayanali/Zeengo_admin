import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { TopHeader } from '@/app/layouts/TopHeader';
import { Sidebar } from '@/app/layouts/Sidebar';
import { notificationsApi } from '@/features/notifications/services/notifications.api';
import { sosApi } from '@/features/sos/services/sos.api';
import { useOpsRealtime } from '@/shared/realtime/useOpsRealtime';
import { cn } from '@/shared/lib/cn';

export function AppShell() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  useOpsRealtime();

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
    refetchInterval: 60_000,
  });

  const sosQuery = useQuery({
    queryKey: ['sos', 'active-count'],
    queryFn: ({ signal }) => sosApi.list({ page: 1, limit: 1, status: 'active' }, signal),
    refetchInterval: 60_000,
    enabled: hasRole('admin', 'ops_manager', 'support', 'splizer', 'driver'),
  });

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) setNavOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const unread = unreadQuery.data?.count ?? 0;
  const sosCount = sosQuery.data?.meta.total ?? 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg)]">
      <a href="#main-content" className="sr-only">
        {t('skipToContent')}
      </a>

      <TopHeader onMenuClick={() => setNavOpen((v) => !v)} />

      <div className="flex min-h-0 flex-1">
        {navOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            aria-label={t('closeMenu')}
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <aside
          className={cn(
            'w-[260px] shrink-0 flex-col border-e border-[var(--shell-line)] bg-[var(--shell)] lg:static lg:z-auto lg:flex lg:pt-0',
            navOpen
              ? 'fixed inset-y-0 start-0 z-40 flex pt-16 lg:static lg:pt-0'
              : 'hidden lg:flex',
          )}
        >
          <div className="hidden border-b border-[var(--shell-line)] px-3 py-3 lg:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
              {t('nav.commandCenter')}
            </p>
            <NavLink
              to="/"
              end
              className="mt-1 block text-sm font-semibold text-[var(--shell-ink)]"
            >
              {t('brand')} Ops
            </NavLink>
          </div>
          <Sidebar
            sosCount={sosCount}
            unread={unread}
            onNavigate={() => setNavOpen(false)}
          />
        </aside>

        <main
          id="main-content"
          className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[var(--bg)] p-3 md:p-4 lg:p-5"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
