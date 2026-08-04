import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { editRequestsApi } from '../services/edit-requests.api';
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
  type StatusTone,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatDate } from '@/shared/lib/cn';

const STATUS_TONE: Record<string, StatusTone> = {
  pending: 'accent',
  approved: 'success',
  rejected: 'danger',
};

export function EditRequestsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: ['edit-requests', { page, status }],
    queryFn: ({ signal }) =>
      editRequestsApi.list({ page, limit: 20, status: status || undefined }, signal),
  });

  const pendingOnPage = useMemo(
    () => (requestsQuery.data?.data ?? []).filter((req) => req.status === 'pending').length,
    [requestsQuery.data],
  );

  async function handleReview(id: string, action: 'approve' | 'reject') {
    setProcessingId(id);
    try {
      if (action === 'approve') {
        await editRequestsApi.approve(id);
        push({ tone: 'success', title: t('editRequests.approved') });
      } else {
        await editRequestsApi.reject(id);
        push({ tone: 'success', title: t('editRequests.rejected') });
      }
      queryClient.invalidateQueries({ queryKey: ['edit-requests'] });
    } catch (error) {
      push({
        tone: 'error',
        title: t('somethingWrong'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <PageScaffold
      title={t('editRequests.title')}
      description={t('editRequests.description')}
      stats={
        requestsQuery.data ? (
          <>
            <StatsCard label={t('bookings.total')} value={requestsQuery.data.meta.total} />
            <StatsCard label={t('common.pending')} value={pendingOnPage} tone="warning" />
          </>
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
          <option value="pending">{t('common.pending')}</option>
          <option value="approved">{t('common.approved')}</option>
          <option value="rejected">{t('common.rejected')}</option>
          <option value="">{t('all')}</option>
        </Select>
      }
    >
      {requestsQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : requestsQuery.isError ? (
        <ErrorState
          description={t('editRequests.loadFailed')}
          onRetry={() => requestsQuery.refetch()}
        />
      ) : !requestsQuery.data?.data.length ? (
        <EmptyState title={t('editRequests.empty')} description={t('tasks.inboxClear')} />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {requestsQuery.data.data.map((req) => (
              <Card key={req.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {req.znCode ?? req.bookingId} · {req.type}
                      </p>
                      <StatusBadge tone={STATUS_TONE[req.status] ?? 'default'}>
                        {req.status}
                      </StatusBadge>
                    </div>
                    {req.reason ? (
                      <p className="mt-1 text-sm text-[var(--ink-muted)]">{req.reason}</p>
                    ) : null}
                    <p className="mt-1 text-sm">
                      {t('editRequests.from')} {req.originalValue ?? '—'} {t('editRequests.to')}{' '}
                      {req.requestedValue ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {formatDate(req.createdAt)}
                    </p>
                  </div>
                  {req.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={processingId === req.id}
                        onClick={() => handleReview(req.id, 'approve')}
                      >
                        {t('editRequests.approve')}
                      </Button>
                      <Button
                        variant="danger"
                        disabled={processingId === req.id}
                        onClick={() => handleReview(req.id, 'reject')}
                      >
                        {t('editRequests.reject')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <Pagination
              page={requestsQuery.data.meta.page}
              limit={requestsQuery.data.meta.limit}
              total={requestsQuery.data.meta.total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </PageScaffold>
  );
}
