import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export type ActionItem = {
  id: string;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
};

export function ActionDropdown({
  items,
  label = 'Actions',
}: {
  items: ActionItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute end-0 z-30 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow)]">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'block w-full px-3 py-2 text-start text-sm hover:bg-[var(--bg-muted)]',
                item.tone === 'danger' ? 'text-[var(--danger)]' : 'text-[var(--ink)]',
              )}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
  stickyHeader = true,
}: {
  columns: Array<{ key: string; header: ReactNode; className?: string }>;
  rows: Array<{ id: string; cells: Record<string, ReactNode> }>;
  empty?: ReactNode;
  stickyHeader?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-sm text-[var(--ink-muted)] shadow-[var(--shadow)]">
        {empty ?? 'No data'}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead
            className={cn(
              'bg-[var(--bg-muted)] text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]',
              stickyHeader && 'sticky top-0 z-10',
            )}
          >
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-4 py-3 text-start font-medium', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-[var(--line)] transition-colors hover:bg-[var(--bg-muted)]/70"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 align-middle', col.className)}>
                    {row.cells[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
