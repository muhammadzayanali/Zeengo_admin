import type { Booking } from '@/shared/api/types';
import { formatDate } from '@/shared/lib/cn';

export function ClientPaymentBar({ booking }: { booking: Booking }) {
  const total = booking.totalAmount;
  const paid = booking.paidAmount;
  const due = booking.dueAmount;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-4 shadow-[var(--shadow)] sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-wider text-[var(--ink-muted)]">
          PAYMENT
        </span>
        <span className="text-xs font-semibold text-[var(--ink-muted)]">{pct}%</span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="TOTAL" value={`$${Number(total).toLocaleString()}`} />
        <Metric
          label="PAID"
          value={`$${Number(paid).toLocaleString()}`}
          valueClass="text-[var(--success)]"
        />
        <Metric
          label="DUE"
          value={`$${Number(due).toLocaleString()}`}
          valueClass="text-[var(--danger)]"
        />
        <Metric label="ARRIVAL" value={formatDate(booking.arrivalDate)} />
        <Metric label="DEPARTURE" value={formatDate(booking.departureDate)} />
        <Metric
          label="PARTY"
          value={`${booking.partySize} · ${booking.client?.nationality || '—'}`}
        />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className={`text-sm font-semibold text-[var(--ink)] ${valueClass ?? ''}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </p>
    </div>
  );
}
