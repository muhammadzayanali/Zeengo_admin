import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { NAV_SECTIONS } from '@/app/nav';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/shared/lib/cn';

const COLLAPSE_KEY = 'zeengo_nav_collapsed';

export function Sidebar({
  sosCount = 0,
  unread = 0,
  onNavigate,
}: {
  sosCount?: number;
  unread?: number;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { pathname } = useLocation();

  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => hasRole(...item.roles)),
      })).filter((section) => section.items.length > 0),
    [hasRole],
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  // Auto-expand section containing active route
  useEffect(() => {
    const active = sections.find((s) =>
      s.items.some((item) =>
        item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
      ),
    );
    if (active && collapsed[active.id]) {
      setCollapsed((prev) => ({ ...prev, [active.id]: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to route
  }, [pathname]);

  function toggleSection(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Main">
      {sections.map((section) => {
        const isCollapsed = Boolean(collapsed[section.id]);
        const sectionActive = section.items.some((item) =>
          item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
        );

        return (
          <div key={section.id} className="pb-1">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em]',
                sectionActive
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--shell-muted)] hover:bg-[var(--shell-elevated)] hover:text-[var(--shell-ink)]',
              )}
            >
              <span>{t(section.sectionKey)}</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  isCollapsed && '-rotate-90',
                )}
              />
            </button>

            {!isCollapsed ? (
              <ul className="mt-0.5 space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'text-[var(--shell-muted)] hover:bg-[var(--shell-elevated)] hover:text-[var(--shell-ink)]',
                          )
                        }
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                          <span className="truncate">{t(item.labelKey)}</span>
                        </span>
                        {item.to === '/sos' && sosCount > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[11px] font-semibold text-white">
                            {sosCount > 99 ? '99+' : sosCount}
                          </span>
                        ) : null}
                        {item.to === '/notifications' && unread > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold text-white">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        ) : null}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
