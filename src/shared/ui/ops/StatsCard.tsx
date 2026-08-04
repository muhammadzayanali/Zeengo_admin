import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/cn';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'accent';

const toneRing: Record<Tone, string> = {
  default: 'text-[var(--ink)]',
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  danger: 'text-[var(--danger)]',
  accent: 'text-[var(--accent)]',
};

export function StatsCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  onClick,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: onClick ? 1.02 : 1 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-start shadow-[var(--shadow)]',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
          {label}
        </p>
        {icon ? (
          <span className={cn('shrink-0 opacity-80', toneRing[tone])}>{icon}</span>
        ) : null}
      </div>
      <p className={cn('mt-2 text-2xl font-semibold tracking-tight', toneRing[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--ink-muted)]">{hint}</p> : null}
    </motion.button>
  );
}
