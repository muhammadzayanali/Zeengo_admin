import type { ReactNode } from 'react';
import type { Booking } from '@/shared/api/types';
import { formatDate } from '@/shared/lib/cn';

type Props = {
  booking: Booking;
};

export function ClientInfoTab({ booking }: Props) {
  const phone = booking.client?.phone ?? '';
  const wa = phone.replace(/\D/g, '');
  const driverName = booking.activeDriverAssignment?.driverName;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
        <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Contact
        </h3>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <span>{phone || '—'}</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="break-all">{booking.client?.email || '—'}</span>
          </li>
          <li className="flex items-center gap-3">
            <span>
              {booking.partySize} persons · {booking.client?.nationality || '—'}
            </span>
          </li>
        </ul>
        {wa ? (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            WhatsApp ↗
          </a>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
        <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Trip Details
        </h3>
        <dl className="space-y-3 text-sm">
          <Row label="Arrival" value={formatDate(booking.arrivalDate)} />
          <Row label="Departure" value={formatDate(booking.departureDate)} />
          <Row
            label="Package"
            value={
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-[10px] text-amber-700">
                  ◆
                </span>
                {booking.package?.name || '—'}
              </span>
            }
          />
          <Row
            label="Driver"
            value={
              driverName ? (
                driverName
              ) : (
                <span className="text-[var(--ink-muted)]">Not assigned</span>
              )
            }
          />
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[var(--ink-muted)]">{label}</dt>
      <dd className="text-end font-medium text-[var(--ink)]">{value}</dd>
    </div>
  );
}
