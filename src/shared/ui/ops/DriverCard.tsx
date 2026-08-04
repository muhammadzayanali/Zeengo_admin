import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { StatusBadge, type StatusTone } from './StatusBadge';
import { cn } from '@/shared/lib/cn';

export function DriverCard({
  name,
  vehicle,
  status,
  statusTone = 'default',
  selected,
  onClick,
}: {
  name: string;
  vehicle?: string;
  status: string;
  statusTone?: StatusTone;
  selected?: boolean;
  onClick?: () => void;
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[16px] border bg-[var(--bg-elevated)] p-3 text-start shadow-[var(--shadow)]',
        selected ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--line)]',
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--ink)]">{name}</span>
        {vehicle ? (
          <span className="block truncate text-xs text-[var(--ink-muted)]">{vehicle}</span>
        ) : null}
      </span>
      <StatusBadge tone={statusTone}>{status}</StatusBadge>
    </motion.button>
  );
}

export function BookingCard({
  title,
  subtitle,
  meta,
  badge,
  badgeTone = 'default',
  action,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  badgeTone?: StatusTone;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--ink)]">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-[var(--ink-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {badge ? <StatusBadge tone={badgeTone}>{badge}</StatusBadge> : null}
      </div>
      {(meta || action) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {meta ? <p className="text-xs text-[var(--ink-muted)]">{meta}</p> : <span />}
          {action}
        </div>
      )}
    </div>
  );
}
