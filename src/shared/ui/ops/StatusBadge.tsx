import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

const tones = {
  default: 'bg-[var(--bg-muted)] text-[var(--ink-muted)]',
  success: 'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]',
  warning: 'bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]',
  danger: 'bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
} as const;

export type StatusTone = keyof typeof tones;

export function StatusBadge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
