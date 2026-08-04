import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type TimelineItem = {
  id: string;
  time?: string;
  title: string;
  description?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  trailing?: ReactNode;
};

const dot: Record<NonNullable<TimelineItem['tone']>, string> = {
  default: 'bg-[var(--ink-muted)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  accent: 'bg-[var(--accent)]',
};

export function Timeline({
  items,
  empty,
  onSelect,
  className,
}: {
  items: TimelineItem[];
  empty?: ReactNode;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  if (!items.length) {
    return (
      <div className={cn('py-6 text-center text-sm text-[var(--ink-muted)]', className)}>
        {empty ?? 'No items'}
      </div>
    );
  }

  return (
    <ol className={cn('relative space-y-0', className)}>
      {items.map((item, idx) => (
        <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
          {idx < items.length - 1 ? (
            <span
              className="absolute start-[7px] top-4 bottom-0 w-px bg-[var(--line)]"
              aria-hidden
            />
          ) : null}
          <span
            className={cn(
              'relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full',
              dot[item.tone ?? 'default'],
            )}
          />
          <button
            type="button"
            className={cn(
              'min-w-0 flex-1 rounded-lg text-start',
              onSelect && 'hover:bg-[var(--bg-muted)] -ms-1 px-1 py-0.5',
            )}
            onClick={() => onSelect?.(item.id)}
            disabled={!onSelect}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {item.time ? (
                  <p className="text-[11px] font-medium text-[var(--ink-muted)]">{item.time}</p>
                ) : null}
                <p className="truncate text-sm font-medium text-[var(--ink)]">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--ink-muted)]">
                    {item.description}
                  </p>
                ) : null}
              </div>
              {item.trailing}
            </div>
          </button>
        </li>
      ))}
    </ol>
  );
}
