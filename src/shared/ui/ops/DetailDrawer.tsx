import type { ReactNode } from 'react';
import { Button } from '../primitives';
import { cn } from '@/shared/lib/cn';

/** Side drawer for detail views (client file, driver, etc.) */
export function DetailDrawer({
  open,
  title,
  onClose,
  children,
  wide,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex h-full w-full flex-col border-s border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]',
          wide ? 'max-w-xl' : 'max-w-md',
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
          <Button type="button" variant="ghost" onClick={onClose} aria-label="Close">
            ×
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? (
          <footer className="border-t border-[var(--line)] p-4">{footer}</footer>
        ) : null}
      </aside>
    </div>
  );
}
