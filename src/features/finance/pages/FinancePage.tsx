import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { financeApi } from '../services/finance.api';
import { Card, ErrorState, PageScaffold, Select, Skeleton, StatsCard } from '@/shared/ui';
import { formatMoney } from '@/shared/lib/cn';

export function FinancePage() {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);

  const summaryQuery = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: ({ signal }) => financeApi.summary(signal),
    refetchInterval: 60_000,
  });

  const revenueQuery = useQuery({
    queryKey: ['finance', 'revenue-by-method', days],
    queryFn: ({ signal }) => financeApi.revenueByMethod(days, signal),
  });

  const maxAmount = Math.max(1, ...(revenueQuery.data?.byMethod.map((m) => m.amount) ?? [0]));

  return (
    <PageScaffold
      title={t('finance.title')}
      description={t('finance.description')}
      stats={
        summaryQuery.isLoading ? (
          <>
            <Skeleton className="h-[92px] w-full rounded-[var(--radius)]" />
            <Skeleton className="h-[92px] w-full rounded-[var(--radius)]" />
            <Skeleton className="h-[92px] w-full rounded-[var(--radius)]" />
          </>
        ) : summaryQuery.data ? (
          <>
            <StatsCard
              label={t('finance.stripeToday')}
              value={formatMoney(summaryQuery.data.today.stripe.amount)}
              hint={t('finance.paymentsCount', { count: summaryQuery.data.today.stripe.count })}
              tone="accent"
            />
            <StatsCard
              label={t('finance.cashToday')}
              value={formatMoney(summaryQuery.data.today.cash.amount)}
              hint={t('finance.paymentsCount', { count: summaryQuery.data.today.cash.count })}
              tone="success"
            />
            <StatsCard
              label={t('finance.pending')}
              value={formatMoney(summaryQuery.data.pending.amount)}
              hint={t('finance.paymentsCount', { count: summaryQuery.data.pending.count })}
              tone="warning"
            />
          </>
        ) : undefined
      }
      filters={
        <Select
          className="max-w-[160px]"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>{t('finance.last7')}</option>
          <option value={30}>{t('finance.last30')}</option>
          <option value={90}>{t('finance.last90')}</option>
        </Select>
      }
    >
      {summaryQuery.isError ? (
        <ErrorState
          description={t('finance.loadFailed')}
          onRetry={() => summaryQuery.refetch()}
        />
      ) : null}

      <Card>
        <h2 className="mb-4 text-lg font-bold">{t('finance.revenueByMethod')}</h2>
        {revenueQuery.isLoading ? (
          <Skeleton className="h-32" />
        ) : revenueQuery.isError || !revenueQuery.data ? (
          <ErrorState
            description={t('finance.revenueFailed')}
            onRetry={() => revenueQuery.refetch()}
          />
        ) : !revenueQuery.data.byMethod.length ? (
          <p className="text-sm text-[var(--ink-muted)]">{t('finance.noRevenue')}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {revenueQuery.data.byMethod.map((row) => (
              <div key={row.method}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold capitalize">{row.method.replace('_', ' ')}</span>
                  <span className="text-[var(--ink-muted)]">
                    {formatMoney(row.amount)} · {t('finance.paymentsCount', { count: row.count })}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-[var(--bg-muted)]">
                  <div
                    className="h-3 rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.max(4, (row.amount / maxAmount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-right text-sm font-semibold">
              {t('finance.total', { amount: formatMoney(revenueQuery.data.total) })}
            </p>
          </div>
        )}
      </Card>
    </PageScaffold>
  );
}
