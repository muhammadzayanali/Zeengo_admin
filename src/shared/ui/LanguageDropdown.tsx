import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LOCALE_OPTIONS, type AppLocale } from '@/shared/i18n';
import { useLocale } from '@/shared/hooks/useShellPrefs';
import { cn } from '@/shared/lib/cn';

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function LanguageDropdown({
  className,
  buttonClassName,
  align = 'end',
}: {
  className?: string;
  buttonClassName?: string;
  align?: 'start' | 'end';
}) {
  const { t } = useTranslation();
  const { locale, localeLabel, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id: AppLocale) => {
    setLocale(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('toggleLanguage')}
        className={cn(
          'inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-[var(--shell-muted)] hover:bg-[var(--shell-elevated)] hover:text-[var(--shell-ink)]',
          open && 'bg-[var(--shell-elevated)] text-[var(--shell-ink)]',
          buttonClassName,
        )}
      >
        <GlobeIcon />
        <span>{localeLabel}</span>
        <span className="text-[10px] opacity-70" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={t('toggleLanguage')}
          className={cn(
            'absolute top-[calc(100%+8px)] z-50 min-w-[11.5rem] overflow-hidden rounded-2xl border border-[var(--shell-line)] bg-[var(--shell)] py-1 shadow-[var(--shadow)]',
            align === 'end' ? 'end-0' : 'start-0',
          )}
        >
          {LOCALE_OPTIONS.map((opt) => {
            const active = opt.id === locale;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pick(opt.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-start text-sm transition',
                  active
                    ? 'bg-[var(--accent-soft,var(--shell-elevated))] font-semibold text-[var(--accent)]'
                    : 'text-[var(--shell-ink)] hover:bg-[var(--shell-elevated)]',
                )}
              >
                <span className="flex flex-col">
                  <span className="font-semibold">{opt.name}</span>
                  <span className="text-[11px] text-[var(--shell-muted)]">
                    {opt.code}
                  </span>
                </span>
                {active ? (
                  <span className="text-[var(--accent)]" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
