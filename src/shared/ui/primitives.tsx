import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    loading?: boolean;
  }
>(function Button(
  { className, variant = 'primary', loading, disabled, children, ...props },
  ref,
) {
  const { t } = useTranslation();
  const styles = {
    primary:
      'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]',
    secondary:
      'border border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink)] hover:bg-[var(--bg-muted)]',
    ghost: 'text-[var(--ink)] hover:bg-[var(--bg-muted)]',
    danger: 'bg-[var(--danger)] text-white hover:opacity-90',
  }[variant];

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50',
        styles,
        className,
      )}
      {...props}
    >
      {loading ? t('pleaseWait') : children}
    </button>
  );
});

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]',
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]',
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-sm font-semibold text-[var(--ink)]', className)}
      {...props}
    />
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>;
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  className?: string;
}) {
  const tones = {
    default: 'bg-[var(--bg-muted)] text-[var(--ink-muted)]',
    success: 'bg-[#e8f8ea] text-[var(--success)]',
    warning: 'bg-[#fff4e5] text-[var(--warning)]',
    danger: 'bg-[#fcebea] text-[var(--danger)]',
    accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  };
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center justify-center rounded-full px-3 py-1 text-xs font-semibold leading-none tracking-normal whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-[var(--bg-muted)]', className)}
      aria-hidden
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line)] px-6 py-16 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-[var(--ink-muted)]">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rounded-2xl border border-[var(--danger)]/30 bg-[#fcebea] p-6">
      <h3 className="text-lg font-bold text-[var(--danger)]">
        {title ?? t('somethingWrong')}
      </h3>
      {description ? (
        <p className="mt-1 text-sm text-[var(--ink-muted)]">{description}</p>
      ) : null}
      {onRetry ? (
        <Button className="mt-4" variant="secondary" onClick={onRetry}>
          {t('tryAgain')}
        </Button>
      ) : null}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--ink-muted)]" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
      {label}
    </div>
  );
}
