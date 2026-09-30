import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export function AnalyticsCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  scrollBody,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Keep header fixed and scroll the body when the card has a max-height. */
  scrollBody?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]',
        scrollBody && 'flex min-h-0 flex-col',
        className,
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-start justify-between gap-3',
          scrollBody && 'shrink-0',
        )}
      >
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div
        className={cn(
          scrollBody &&
            'min-h-0 flex-1 overflow-y-auto overscroll-contain pe-3 [scrollbar-gutter:stable] [scrollbar-width:thin]',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
