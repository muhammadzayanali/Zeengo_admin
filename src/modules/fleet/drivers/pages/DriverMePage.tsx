import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { driverKeys, driversApi } from '../services/drivers.api';
import {
  Button,
  EmptyState,
  ErrorState,
  PageScaffold,
  Select,
  Skeleton,
  StatsCard,
  StatusBadge,
  useToast,
  type StatusTone,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { DailyOperationItem } from '@/shared/api/types';

function taskTone(status: string): StatusTone {
  if (status === 'done') return 'success';
  if (status === 'active') return 'accent';
  if (status === 'cancelled') return 'danger';
  return 'default';
}

function nextStatus(status: string) {
  if (status === 'pending') return 'active';
  if (status === 'active') return 'done';
  return 'pending';
}

export function DriverMePage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();
  const [day, setDay] = useState<'today' | 'tomorrow'>('today');

  const scheduleQuery = useQuery({
    queryKey: driverKeys.mySchedule(day),
    queryFn: ({ signal }) => driversApi.mySchedule(day, signal),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const items = scheduleQuery.data?.items ?? [];
  const done = items.filter((i) => i.status === 'done').length;

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      driversApi.updateMyScheduleItem(id, status),
    onSuccess: async () => {
      push({ tone: 'success', title: t('drivers.stepUpdated') });
      await qc.invalidateQueries({ queryKey: driverKeys.all });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  return (
    <PageScaffold
      title={t('drivers.mySchedule')}
      description={t('drivers.myScheduleDesc')}
      stats={
        <>
          <StatsCard label={t('drivers.stepsToday')} value={items.length} />
          <StatsCard label={t('drivers.completed')} value={done} tone="success" />
          <StatsCard
            label={t('drivers.remaining')}
            value={items.length - done}
            tone="warning"
          />
          <StatsCard
            label={t('drivers.progress')}
            value={`${items.length ? Math.round((done / items.length) * 100) : 0}%`}
            tone="accent"
          />
        </>
      }
      filters={
        <Select
          className="max-w-[160px]"
          value={day}
          onChange={(e) => setDay(e.target.value as 'today' | 'tomorrow')}
        >
          <option value="today">{t('today')}</option>
          <option value="tomorrow">{t('tomorrow')}</option>
        </Select>
      }
    >
      {scheduleQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : scheduleQuery.isError ? (
        <ErrorState
          title={t('drivers.scheduleFailed')}
          description={
            scheduleQuery.error instanceof ApiClientError
              ? scheduleQuery.error.message
              : undefined
          }
          onRetry={() => void scheduleQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState title={t('drivers.noTrips')} description={t('drivers.noTripsHint')} />
      ) : (
        <div className="space-y-3">
          {items.map((item: DailyOperationItem) => {
            const complete = item.status === 'done';
            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-semibold ${complete ? 'line-through opacity-60' : ''}`}>
                      {item.startTime ? `${item.startTime.slice(0, 5)} · ` : ''}
                      {item.title}
                    </p>
                    <StatusBadge tone={taskTone(item.status)}>
                      {item.status.replace('_', ' ')}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    {item.locationName || '—'}
                    {item.clientName ? ` · ${item.clientName}` : ''}
                    {item.znCode ? ` (${item.znCode})` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={item.status === 'active' || updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({ id: item.id, status: 'active' })
                    }
                  >
                    {t('drivers.inProgress')}
                  </Button>
                  <Button
                    type="button"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={complete || updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: item.id,
                        status: nextStatus(item.status) === 'pending' ? 'done' : 'done',
                      })
                    }
                  >
                    {t('drivers.complete')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageScaffold>
  );
}
