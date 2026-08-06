import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { clientsApi } from '@/modules/clients/services/clients.api';
import { notificationsApi } from '@/modules/tools/notifications/services/notifications.api';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useTranslation } from 'react-i18next';
import {
  initials,
  roleBadge,
  useLocale,
  useRoleLabel,
  useTheme,
} from '@/shared/hooks/useShellPrefs';
import { cn } from '@/shared/lib/cn';

export function TopHeader({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const { t } = useTranslation();
  const roleLabel = useRoleLabel();
  const { user, logout, hasRole, homePath, can } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useLocale();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const debounced = useDebouncedValue(search, 250);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
    refetchInterval: 60_000,
  });
  const unread = unreadQuery.data?.count ?? 0;

  const clientsQuery = useQuery({
    queryKey: ['clients', 'header-search', debounced],
    queryFn: ({ signal }) =>
      clientsApi.list({ page: 1, limit: 8, search: debounced }, signal),
    enabled: can('clients') && debounced.trim().length >= 2,
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--shell-line)] bg-[var(--shell)] px-3 text-[var(--shell-ink)] md:px-4">
      <div className="flex min-w-0 items-center gap-2 lg:w-[244px] lg:shrink-0">
        {onMenuClick ? (
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--shell-muted)] hover:bg-[var(--shell-elevated)] lg:hidden"
            aria-label={t('openMenu')}
            onClick={onMenuClick}
          >
            <MenuIcon />
          </button>
        ) : null}
        <Link to={homePath} className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-white">
            Z
          </span>
          <span className="truncate text-sm font-semibold tracking-[0.08em] text-[var(--shell-ink)]">
            ZEENGO
          </span>
          <span className="hidden rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--accent)] sm:inline">
            {roleBadge(user?.role)}
          </span>
        </Link>
      </div>

      <div className="mx-1 hidden h-8 w-px bg-[var(--shell-line)] lg:block" />

      {can('clients') ? (
      <div ref={searchRef} className="relative min-w-0 flex-1">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--shell-muted)]">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder={t('searchClients')}
            className="h-10 w-full rounded-full border border-transparent bg-[var(--shell-elevated)] py-2 pl-10 pr-4 text-sm text-[var(--shell-ink)] outline-none placeholder:text-[var(--shell-muted)] focus:border-[var(--accent)]"
            aria-label={t('searchClients')}
          />
        </div>
        {searchOpen && debounced.trim().length >= 2 ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-2xl border border-[var(--shell-line)] bg-[var(--shell)] shadow-[var(--shadow)]">
            {clientsQuery.isLoading ? (
              <p className="px-4 py-3 text-sm text-[var(--shell-muted)]">{t('searching')}</p>
            ) : !clientsQuery.data?.data.length ? (
              <p className="px-4 py-3 text-sm text-[var(--shell-muted)]">{t('noClientsFound')}</p>
            ) : (
              <ul>
                {clientsQuery.data.data.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-[var(--shell-elevated)]"
                      onClick={() => {
                        setSearch('');
                        setSearchOpen(false);
                        navigate(`/clients?search=${encodeURIComponent(c.fullName)}`);
                      }}
                    >
                      <span>
                        <span className="block font-semibold text-[var(--shell-ink)]">{c.fullName}</span>
                        <span className="text-[var(--shell-muted)]">{c.phone}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="w-full border-t border-[var(--shell-line)] px-4 py-2.5 text-left text-sm font-semibold text-[var(--accent)] hover:bg-[var(--shell-elevated)]"
              onClick={() => {
                navigate(`/clients?search=${encodeURIComponent(debounced)}`);
                setSearchOpen(false);
              }}
            >
              {t('viewAllResults')}
            </button>
          </div>
        ) : null}
      </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        <IconButton
          label={theme === 'dark' ? t('lightMode') : t('darkMode')}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconButton>
        <button
          type="button"
          onClick={toggleLocale}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-[var(--shell-muted)] hover:bg-[var(--shell-elevated)] hover:text-[var(--shell-ink)]"
          aria-label={t('toggleLanguage')}
        >
          <GlobeIcon />
          <span>{locale === 'ar' ? 'AR' : 'EN'}</span>
        </button>
        <Link
          to="/notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--shell-muted)] hover:bg-[var(--shell-elevated)] hover:text-[var(--shell-ink)]"
          aria-label={t('notifications')}
        >
          <BellIcon />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--danger)]" />
          ) : null}
        </Link>

        <div className="mx-1 hidden h-8 w-px bg-[var(--shell-line)] sm:block" />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-[var(--shell-elevated)] sm:px-2"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                {initials(user?.fullName)}
              </span>
            )}
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight text-[var(--shell-ink)]">
                {user?.fullName ?? 'Staff'}
              </span>
              <span className="block text-xs text-[var(--accent)]">
                {roleLabel(user?.role)}
              </span>
            </span>
            <ChevronIcon className="hidden text-[var(--shell-muted)] sm:block" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute end-0 top-[calc(100%+8px)] z-40 w-52 overflow-hidden rounded-2xl border border-[var(--shell-line)] bg-[var(--shell)] py-1 shadow-[var(--shadow)]"
            >
              <div className="border-b border-[var(--shell-line)] px-3 py-2">
                <p className="truncate text-sm font-semibold text-[var(--shell-ink)]">{user?.email}</p>
              </div>
              {hasRole('admin') ? (
                <Link
                  role="menuitem"
                  to="/settings"
                  className="block px-3 py-2.5 text-sm text-[var(--shell-muted)] hover:bg-[var(--shell-elevated)] hover:text-[var(--shell-ink)]"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('settings')}
                </Link>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2.5 text-left text-sm text-[var(--shell-muted)] hover:bg-[var(--shell-elevated)] hover:text-[var(--shell-ink)]"
                onClick={() => {
                  setMenuOpen(false);
                  void logout();
                }}
              >
                {t('logOut')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--shell-muted)] hover:bg-[var(--shell-elevated)] hover:text-[var(--shell-ink)]"
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn(className)}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
