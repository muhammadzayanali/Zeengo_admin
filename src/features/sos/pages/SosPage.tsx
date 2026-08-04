import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { sosApi } from '../services/sos.api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageScaffold,
  Pagination,
  Select,
  Skeleton,
  StatsCard,
  StatusBadge,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatDate } from '@/shared/lib/cn';

export function SosPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const sosQuery = useQuery({
    queryKey: ['sos', { page, status }],
    queryFn: ({ signal }) =>
      sosApi.list({ page, limit: 20, status: status || undefined }, signal),
    refetchInterval: 20_000,
  });

  async function handleResolve(id: string) {
    setResolvingId(id);
    try {
      await sosApi.resolve(id);
      push({ tone: 'success', title: t('sos.resolved') });
      queryClient.invalidateQueries({ queryKey: ['sos'] });
    } catch (error) {
      push({
        tone: 'error',
        title: t('somethingWrong'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <PageScaffold
      title={t('sos.title')}
      description={t('sos.description')}
      stats={
        sosQuery.data ? (
          <StatsCard
            label={t('bookings.total')}
            value={sosQuery.data.meta.total}
            tone={status === 'active' ? 'danger' : 'default'}
          />
        ) : undefined
      }
      filters={
        <Select
          className="max-w-xs"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="active">{t('common.active')}</option>
          <option value="resolved">{t('common.resolved')}</option>
          <option value="">{t('all')}</option>
        </Select>
      }
    >
      {sosQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : sosQuery.isError ? (
        <ErrorState description={t('sos.loadFailed')} onRetry={() => sosQuery.refetch()} />
      ) : !sosQuery.data?.data.length ? (
        <EmptyState title={t('sos.empty')} description={t('sos.calm')} />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {sosQuery.data.data.map((alert) => (
              <Card key={alert.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{alert.bookingId}</p>
                      <StatusBadge tone={alert.status === 'active' ? 'danger' : 'success'}>
                        {alert.status}
                      </StatusBadge>
                    </div>
                    {alert.message ? (
                      <p className="mt-1 text-sm text-[var(--ink-muted)]">{alert.message}</p>
                    ) : null}
                    {alert.lat != null && alert.lng != null ? (
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {formatDate(alert.createdAt)}
                    </p>
                  </div>
                  {alert.status === 'active' ? (
                    <Button
                      variant="danger"
                      disabled={resolvingId === alert.id}
                      onClick={() => handleResolve(alert.id)}
                    >
                      {t('sos.resolve')}
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <Pagination
              page={sosQuery.data.meta.page}
              limit={sosQuery.data.meta.limit}
              total={sosQuery.data.meta.total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </PageScaffold>
  );
}
