import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/cn';

export function PageScaffold({
  title,
  description,
  primaryAction,
  filters,
  stats,
  children,
  timeline,
  className,
}: {
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  filters?: ReactNode;
  stats?: ReactNode;
  children?: ReactNode;
  timeline?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('space-y-4', className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)] md:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-[var(--ink-muted)]">{description}</p>
          ) : null}
        </div>
        {primaryAction ? <div className="flex shrink-0 flex-wrap gap-2">{primaryAction}</div> : null}
      </header>

      {stats ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats}</div> : null}

      {filters ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow)]">
          {filters}
        </div>
      ) : null}

      <div className={cn(timeline && 'grid gap-4 xl:grid-cols-[1fr_280px]')}>
        <div className="min-w-0 space-y-4">{children}</div>
        {timeline ? <aside className="min-w-0">{timeline}</aside> : null}
      </div>
    </motion.div>
  );
}
