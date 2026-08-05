import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export function TabBar({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-[var(--bg-muted)] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
            value === tab.id
              ? 'bg-[var(--bg-elevated)] text-[var(--ink)] shadow-sm'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
          )}
        >
          {tab.label}
          {tab.count != null ? (
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-xs font-semibold',
                value === tab.id ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--line)]',
              )}
            >
              {tab.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function SectionHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-[var(--ink-muted)]">{children}</p>;
}
