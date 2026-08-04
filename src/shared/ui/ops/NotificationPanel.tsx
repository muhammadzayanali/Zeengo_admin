import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  time?: string;
  unread?: boolean;
};

export function NotificationPanel({
  items,
  empty,
  footer,
  className,
}: {
  items: NotificationItem[];
  empty?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]',
        className,
      )}
    >
      <ul className="divide-y divide-[var(--line)]">
        {items.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
            {empty ?? 'No notifications'}
          </li>
        ) : (
          items.map((n) => (
            <li key={n.id} className="flex gap-3 px-4 py-3">
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  n.unread ? 'bg-[var(--accent)]' : 'bg-transparent',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-[var(--ink)]">{n.title}</p>
                  {n.time ? (
                    <span className="shrink-0 text-[11px] text-[var(--ink-muted)]">{n.time}</span>
                  ) : null}
                </div>
                {n.body ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--ink-muted)]">{n.body}</p>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
      {footer ? <div className="border-t border-[var(--line)] px-4 py-3">{footer}</div> : null}
    </div>
  );
}
