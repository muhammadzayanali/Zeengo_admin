import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { financeApi } from '../services/finance.api';
import { paymentsApi } from '../payments/services/payments.api';
import {
  EmptyState,
  ErrorState,
  PageScaffold,
  Pagination,
  Select,
  Skeleton,
  StatsCard,
  StatusBadge,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib/cn';
import type { RevenueSeriesPoint } from '@/shared/api/types';

function methodLabel(method: string, t: (k: string) => string) {
  if (method === 'cash') return t('splizer.methodCash');
  if (method === 'rajhi_transfer') return t('splizer.methodRajhi');
  if (method === 'usdt_trc20') return t('splizer.methodTrc20');
  if (method === 'usdt_bep20') return t('splizer.methodBep20');
  if (method === 'stripe') return t('splizer.stripe');
  return method;
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'accent' | 'default' {
  if (status === 'paid') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'sent' || status === 'opened') return 'accent';
  if (status === 'failed' || status === 'expired') return 'danger';
  return 'default';
}

function RevenueChart({ points }: { points: RevenueSeriesPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.total));
  return (
    <div className="flex h-48 items-end gap-1.5">
      {points.map((p) => {
        const stripeH = (p.stripe / max) * 100;
        const cashH = (p.cash / max) * 100;
        const label = p.date.slice(5);
        return (
          <div key={p.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-40 w-full flex-col justify-end overflow-hidden rounded-t-md bg-[var(--bg-muted)]">
              <div
                className="w-full bg-[var(--accent)]"
                style={{ height: `${stripeH}%` }}
                title={`Stripe ${formatMoney(p.stripe)}`}
              />
              <div
                className="w-full bg-[var(--success)]"
                style={{ height: `${cashH}%` }}
                title={`Cash ${formatMoney(p.cash)}`}
              />
            </div>
            <span className="truncate text-[10px] text-[var(--ink-muted)]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function FinancePage() {
  const { t } = useTranslation();
  const [days, setDays] = useState(7);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);

  const summaryQuery = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: ({ signal }) => financeApi.summary(signal),
  });

  const seriesQuery = useQuery({
    queryKey: ['finance', 'series', days],
    queryFn: ({ signal }) => financeApi.revenueSeries(days, signal),
  });

  const ledgerQuery = useQuery({
    queryKey: ['payments', 'history', 'finance', { page, status, method }],
    queryFn: ({ signal }) =>
      paymentsApi.history(
        {
          page,
          limit: 20,
          status: status || undefined,
          method: method || undefined,
        },
        signal,
      ),
  });

  const summary = summaryQuery.data;
  const todayTotal = summary?.today.total?.amount ?? (summary?.today.stripe.amount ?? 0) + (summary?.today.cash.amount ?? 0);

  return (
    <PageScaffold
      title={t('finance.title')}
      description={t('finance.description')}
      stats={
        summaryQuery.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : summaryQuery.isError ? (
          <ErrorState title={t('finance.loadFailed')} onRetry={() => void summaryQuery.refetch()} />
        ) : summary ? (
          <>
            <StatsCard
              label={t('finance.today')}
              value={formatMoney(todayTotal)}
              hint={t('finance.paymentsCount', { count: summary.today.total?.count ?? summary.today.stripe.count + summary.today.cash.count })}
              tone="accent"
            />
            <StatsCard
              label={t('finance.stripeToday')}
              value={formatMoney(summary.today.stripe.amount)}
              hint={t('finance.paymentsCount', { count: summary.today.stripe.count })}
            />
            <StatsCard
              label={t('finance.cashToday')}
              value={formatMoney(summary.today.cash.amount)}
              hint={t('finance.paymentsCount', { count: summary.today.cash.count })}
              tone="success"
            />
            <StatsCard
              label={t('finance.pending')}
              value={formatMoney(summary.pending.amount)}
              hint={t('finance.paymentsCount', { count: summary.pending.count })}
              tone="warning"
            />
          </>
        ) : undefined
      }
    >
      <section className="mb-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{t('finance.revenueByMethod')}</h2>
            <p className="text-xs text-[var(--ink-muted)]">{t('finance.chartHint')}</p>
          </div>
          <Select
            className="max-w-[160px]"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>{t('finance.last7')}</option>
            <option value={30}>{t('finance.last30')}</option>
            <option value={90}>{t('finance.last90')}</option>
          </Select>
        </div>
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[var(--accent)]" /> Stripe
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[var(--success)]" /> {t('finance.cashToday')}
          </span>
        </div>
        {seriesQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : seriesQuery.isError ? (
          <ErrorState title={t('finance.revenueFailed')} onRetry={() => void seriesQuery.refetch()} />
        ) : !seriesQuery.data?.points.some((p) => p.total > 0) ? (
          <EmptyState title={t('finance.noRevenue')} />
        ) : (
            <div className="overflow-x-auto pb-1">
          <RevenueChart points={seriesQuery.data.points} />
            </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
          <h2 className="text-sm font-semibold">{t('finance.allPayments')}</h2>
          <div className="flex flex-wrap gap-2">
            <Select
              className="max-w-[150px]"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('finance.allStatus')}</option>
              <option value="paid">{t('finance.paid')}</option>
              <option value="pending">{t('common.pending')}</option>
              <option value="sent">{t('finance.sent')}</option>
              <option value="opened">{t('finance.opened')}</option>
              <option value="failed">{t('finance.failed')}</option>
              <option value="expired">{t('finance.expired')}</option>
            </Select>
            <Select
              className="max-w-[180px]"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('finance.allMethods')}</option>
              <option value="stripe">Stripe</option>
              <option value="cash">{t('splizer.methodCash')}</option>
              <option value="rajhi_transfer">{t('splizer.methodRajhi')}</option>
              <option value="usdt_trc20">{t('splizer.methodTrc20')}</option>
              <option value="usdt_bep20">{t('splizer.methodBep20')}</option>
            </Select>
          </div>
        </div>

        {ledgerQuery.isLoading ? (
          <div className="p-4">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : ledgerQuery.isError ? (
          <div className="p-4">
            <ErrorState title={t('payments.loadFailed')} onRetry={() => void ledgerQuery.refetch()} />
          </div>
        ) : (ledgerQuery.data?.data ?? []).length === 0 ? (
          <div className="p-6">
            <EmptyState title={t('finance.noPayments')} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--ink-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-start">{t('common.client')}</th>
                    <th className="px-4 py-3 text-start">{t('payments.zn')}</th>
                    <th className="px-4 py-3 text-start">{t('splizer.method')}</th>
                    <th className="px-4 py-3 text-start">{t('common.amount')}</th>
                    <th className="px-4 py-3 text-start">{t('common.status')}</th>
                    <th className="px-4 py-3 text-start">{t('payments.when')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledgerQuery.data?.data ?? []).map((tx) => (
                    <tr key={tx.id} className="border-t border-[var(--line)]">
                      <td className="px-4 py-3 font-medium">{tx.clientName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--ink-muted)]">
                        {tx.znCode}
                      </td>
                      <td className="px-4 py-3">{methodLabel(tx.method, t)}</td>
                      <td className="px-4 py-3 font-semibold">{formatMoney(tx.amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={statusTone(tx.status)}>
                          {tx.status === 'paid'
                            ? t('finance.paid')
                            : tx.status === 'pending'
                              ? t('common.pending')
                              : tx.status === 'sent'
                                ? t('finance.sent')
                                : tx.status === 'opened'
                                  ? t('finance.opened')
                                  : tx.status === 'failed'
                                    ? t('finance.failed')
                                    : tx.status === 'expired'
                                      ? t('finance.expired')
                                      : tx.status}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-muted)]">
                        {new Date(tx.paidAt || tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--line)] px-4 py-3">
              <Pagination
                page={ledgerQuery.data?.meta.page ?? page}
                limit={ledgerQuery.data?.meta.limit ?? 20}
                total={ledgerQuery.data?.meta.total ?? 0}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </section>
    </PageScaffold>
  );
}
