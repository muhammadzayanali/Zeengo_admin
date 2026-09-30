import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { bookingsApi } from '../services/bookings.api';
import { Badge, Button, Input, Skeleton, useToast } from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { ItineraryItem } from '@/shared/api/types';
import { formatRequestMoney } from '../lib/requestMoney';

const KIND_LABEL: Record<string, string> = {
  hotel: 'Hotel',
  activity: 'Experience',
  guide: 'Guide',
  restaurant: 'Restaurant',
  transfer: 'Transfer',
  train: 'Train',
  car: 'Car',
  service: 'Service',
};

export function CustomerRequestItems({
  bookingId,
  items,
  loading,
  totalAmount,
  canWrite,
  onSaved,
}: {
  bookingId: string;
  items: ItineraryItem[];
  loading: boolean;
  totalAmount: number | string | null | undefined;
  canWrite: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const { push } = useToast();
  const requested = items.filter((i) => i.customerRequest);
  const priced = requested.filter((i) => i.customerRequest?.indicativePrice);
  const currencies = new Set(priced.map((i) => i.customerRequest!.indicativePrice!.currency));
  const currency = currencies.size === 1 ? [...currencies][0]! : 'RUB';
  const indicativeSum = priced.reduce(
    (sum, i) => sum + i.customerRequest!.indicativePrice!.amount,
    0,
  );
  const currentTotal = Number(totalAmount ?? 0);
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? (currentTotal > 0 ? String(currentTotal) : '');

  const saveTotal = useMutation({
    mutationFn: (amount: number) => bookingsApi.update(bookingId, { totalAmount: amount }),
    onSuccess: async () => {
      setDraft(null);
      push({ tone: 'success', title: 'Final total saved' });
      await onSaved();
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : 'Could not save the total',
      }),
  });

  if (loading) return <Skeleton className="mt-3 h-24" />;
  if (!requested.length) return null;

  const parsed = Number(value);
  const valid = value.trim() !== '' && Number.isFinite(parsed) && parsed >= 0;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        Requested services ({requested.length})
      </p>
      <ul className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-[var(--bg)]">
        {requested.map((item) => {
          const r = item.customerRequest!;
          return (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 p-2.5 text-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="accent">{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                  <span className="font-medium">{item.title}</span>
                </div>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{item.description}</p>
                ) : null}
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  Day {item.dayNumber}
                  {item.itemDate ? ` · ${item.itemDate}` : ''}
                  {r.time ? ` · ${r.time}` : ''}
                  {r.pax ? ` · ${r.pax} pax` : ''}
                </p>
              </div>
              <div className="text-right text-xs">
                {r.indicativePrice ? (
                  <>
                    <p className="font-semibold">
                      {formatRequestMoney(r.indicativePrice.amount, r.indicativePrice.currency)}
                    </p>
                    <p className="text-[var(--ink-muted)]">{r.indicativePrice.basis}</p>
                  </>
                ) : (
                  <p className="text-[var(--ink-muted)]">No catalog price</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-end justify-between gap-3 text-sm">
        <p className="text-xs text-[var(--ink-muted)]">
          Indicative sum shown to customer{' '}
          <strong className="text-[var(--ink)]">{formatRequestMoney(indicativeSum, currency)}</strong>
          {priced.length < requested.length ? ` · ${requested.length - priced.length} unpriced` : ''}
          <br />
          Final total now{' '}
          <strong className="text-[var(--ink)]">
            {currentTotal > 0 ? formatRequestMoney(currentTotal, currency) : 'not set'}
          </strong>
        </p>
        {canWrite ? (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) saveTotal.mutate(parsed);
            }}
          >
            <Input
              type="number"
              min={0}
              step="1"
              inputMode="decimal"
              aria-label={`Final total (${currency})`}
              placeholder={`Final total (${currency})`}
              className="!h-8 w-40 !text-xs"
              value={value}
              onChange={(e) => setDraft(e.target.value)}
            />
            {indicativeSum > 0 && value === '' ? (
              <Button
                type="button"
                variant="secondary"
                className="!h-8 !px-2.5 !text-xs"
                onClick={() => setDraft(String(indicativeSum))}
              >
                Use indicative
              </Button>
            ) : null}
            <Button
              type="submit"
              className="!h-8 !px-2.5 !text-xs"
              disabled={!valid || parsed === currentTotal}
              loading={saveTotal.isPending}
            >
              Save total
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
