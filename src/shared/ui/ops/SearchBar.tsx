import { Search } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'relative flex min-w-0 flex-1 items-center',
        className,
      )}
    >
      <Search
        className="pointer-events-none absolute start-3 h-4 w-4 text-[var(--ink-muted)]"
        aria-hidden
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] pe-3 ps-9 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
      />
    </label>
  );
}
