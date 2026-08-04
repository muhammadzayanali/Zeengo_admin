import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { vipApi } from '../services/vip.api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Skeleton,
  StatsCard,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatDate, formatMoney } from '@/shared/lib/cn';

export function VipPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [activating, setActivating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: ['vip', 'overview'],
    queryFn: ({ signal }) => vipApi.overview(signal),
  });

  const requestsQuery = useQuery({
    queryKey: ['vip', 'requests'],
    queryFn: ({ signal }) => vipApi.requests(signal),
  });

  const clientsQuery = useQuery({
    queryKey: ['vip', 'clients'],
    queryFn: ({ signal }) => vipApi.clients(signal),
  });

  async function handleActivate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const bookingId = String(form.get('bookingId') || '');
    if (!bookingId) return;
    setActivating(true);
    try {
      await vipApi.activate(bookingId);
      push({ tone: 'success', title: t('vip.activated') });
      e.currentTarget.reset();
      queryClient.invalidateQueries({ queryKey: ['vip'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setActivating(false);
    }
  }

  return (
    <PageScaffold
      title={t('vip.title')}
      description={t('vip.description')}
      stats={
        overviewQuery.isLoading ? (
          <>
            <Skeleton className="h-[92px] w-full rounded-[var(--radius)]" />
            <Skeleton className="h-[92px] w-full rounded-[var(--radius)]" />
            <Skeleton className="h-[92px] w-full rounded-[var(--radius)]" />
          </>
        ) : overviewQuery.data ? (
          <>
            <StatsCard
              label={t('vip.vipBookings')}
              value={overviewQuery.data.totalVipBookings}
              tone="accent"
            />
            <StatsCard
              label={t('vip.pendingUpgrades')}
              value={overviewQuery.data.pendingUpgradeRequests}
              tone="warning"
            />
            <StatsCard
              label={t('vip.vipRevenue')}
              value={formatMoney(overviewQuery.data.vipRevenue)}
              tone="success"
            />
          </>
        ) : undefined
      }
    >
      {overviewQuery.isError ? (
        <ErrorState
          description={t('vip.loadFailed')}
          onRetry={() => overviewQuery.refetch()}
        />
      ) : null}

      <Card>
        <h2 className="text-lg font-bold">{t('vip.activate')}</h2>
        <form onSubmit={handleActivate} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="vipBookingId">{t('payments.bookingId')}</Label>
            <Input id="vipBookingId" name="bookingId" required />
          </div>
          <Button type="submit" loading={activating}>
            {t('vip.activate')}
          </Button>
        </form>
        {formError ? <p className="mt-3 text-sm text-[var(--danger)]">{formError}</p> : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">{t('vip.upgradeRequests')}</h2>
          <div className="mt-4 flex flex-col gap-3">
            {requestsQuery.isLoading ? (
              <Skeleton className="h-16" />
            ) : !requestsQuery.data?.length ? (
              <EmptyState title={t('vip.noRequests')} />
            ) : (
              requestsQuery.data.map((req) => (
                <div key={req.id} className="rounded-xl border border-[var(--line)] p-3 text-sm">
                  <p className="font-semibold">{req.znCode ?? req.bookingId}</p>
                  {req.reason ? (
                    <p className="mt-1 text-[var(--ink-muted)]">{req.reason}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {formatDate(req.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">{t('vip.vipClients')}</h2>
          <div className="mt-4 flex flex-col gap-3">
            {clientsQuery.isLoading ? (
              <Skeleton className="h-16" />
            ) : !clientsQuery.data?.length ? (
              <EmptyState title={t('vip.noClients')} />
            ) : (
              clientsQuery.data.map((client) => (
                <div
                  key={client.bookingId}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">
                      {client.znCode} · {client.clientName}
                    </p>
                    <p className="text-[var(--ink-muted)]">
                      {formatDate(client.vipActivatedAt)}
                    </p>
                  </div>
                  <span className="font-semibold">{formatMoney(client.totalAmount)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </PageScaffold>
  );
}
