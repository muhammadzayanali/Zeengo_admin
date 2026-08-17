import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { notificationsApi } from '../services/notifications.api';
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

export function NotificationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications', { page, filter }],
    queryFn: ({ signal }) => notificationsApi.list({ page, limit: 20, filter }, signal),
  });

  async function handleMarkRead(id: string) {
    try {
      await notificationsApi.markRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      push({
        tone: 'error',
        title: t('somethingWrong'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      push({ tone: 'success', title: t('notificationsPage.allRead') });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      push({
        tone: 'error',
        title: t('somethingWrong'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadTotal = unreadQuery.data?.count ?? 0;

  return (
    <PageScaffold
      title={t('notificationsPage.title')}
      description={t('notificationsPage.description')}
      primaryAction={
        <Button variant="secondary" onClick={handleMarkAll} loading={markingAll}>
          {t('notificationsPage.markAll')}
        </Button>
      }
      stats={
        notificationsQuery.data ? (
          <>
            <StatsCard label={t('bookings.total')} value={notificationsQuery.data.meta.total} />
            <StatsCard
              label={t('notificationsPage.unread')}
              value={unreadTotal}
              tone="accent"
            />
          </>
        ) : undefined
      }
      filters={
        <Select
          className="max-w-xs"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as 'all' | 'unread');
            setPage(1);
          }}
        >
          <option value="all">{t('all')}</option>
          <option value="unread">{t('notificationsPage.unread')}</option>
        </Select>
      }
    >
      {notificationsQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : notificationsQuery.isError ? (
        <ErrorState
          description={t('notificationsPage.loadFailed')}
          onRetry={() => notificationsQuery.refetch()}
        />
      ) : !notificationsQuery.data?.data.length ? (
        <EmptyState
          title={t('notificationsPage.empty')}
          description={t('notificationsPage.caughtUp')}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {notificationsQuery.data.data.map((notification) => {
              const unread = !notification.isRead;
              return (
              <Card
                key={notification.id}
                className={
                  unread
                    ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]/40'
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={
                        unread
                          ? 'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--danger)] ring-4 ring-[var(--danger)]/15'
                          : 'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-transparent'
                      }
                      aria-hidden={!unread}
                      aria-label={unread ? t('notificationsPage.unread') : undefined}
                      title={unread ? t('notificationsPage.unread') : undefined}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={unread ? 'font-semibold' : 'font-medium text-[var(--ink-muted)]'}>
                          {notification.title}
                        </p>
                        {unread ? (
                          <StatusBadge tone="accent">{t('notificationsPage.new')}</StatusBadge>
                        ) : null}
                      </div>
                      {notification.body ? (
                        <p className="mt-1 text-sm text-[var(--ink-muted)]">{notification.body}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  {unread ? (
                    <Button variant="secondary" onClick={() => handleMarkRead(notification.id)}>
                      {t('notificationsPage.markRead')}
                    </Button>
                  ) : null}
                </div>
              </Card>
              );
            })}
          </div>
          <div className="mt-4">
            <Pagination
              page={notificationsQuery.data.meta.page}
              limit={notificationsQuery.data.meta.limit}
              total={notificationsQuery.data.meta.total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </PageScaffold>
  );
}
