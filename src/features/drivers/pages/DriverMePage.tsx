import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { driversApi } from '../services/drivers.api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageScaffold,
  Select,
  Skeleton,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';

const STATUS_OPTIONS = ['available', 'en_route', 'busy', 'offline'] as const;

export function DriverMePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [scheduleDate, setScheduleDate] = useState<'today' | 'tomorrow'>('today');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const scheduleQuery = useQuery({
    queryKey: ['drivers', 'me', 'schedule', scheduleDate],
    queryFn: ({ signal }) => driversApi.mySchedule(scheduleDate, signal),
  });

  function statusLabel(status: string) {
    if (status === 'available') return t('drivers.available');
    if (status === 'busy') return t('drivers.busy');
    if (status === 'offline') return t('drivers.offline');
    return status.replace('_', ' ');
  }

  async function handleStatusChange(status: string) {
    setUpdatingStatus(true);
    try {
      await driversApi.myStatus(status);
      push({ tone: 'success', title: t('drivers.statusUpdated') });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    } catch (error) {
      push({
        tone: 'error',
        title: t('somethingWrong'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <PageScaffold title={t('drivers.mySchedule')} description={t('drivers.myScheduleDesc')}>
      <Card className="mb-4">
        <h2 className="text-sm font-semibold">{t('drivers.setStatus')}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <Button
              key={status}
              variant="secondary"
              disabled={updatingStatus}
              onClick={() => handleStatusChange(status)}
            >
              {statusLabel(status)}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('dashboard.schedule')}</h2>
          <Select
            className="max-w-[160px]"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value as 'today' | 'tomorrow')}
          >
            <option value="today">{t('today')}</option>
            <option value="tomorrow">{t('tomorrow')}</option>
          </Select>
        </div>
        {scheduleQuery.isLoading ? (
          <Skeleton className="h-32" />
        ) : scheduleQuery.isError ? (
          <ErrorState
            description={t('drivers.scheduleFailed')}
            onRetry={() => scheduleQuery.refetch()}
          />
        ) : !scheduleQuery.data?.items.length ? (
          <EmptyState title={t('drivers.noTrips')} />
        ) : (
          <div className="flex flex-col gap-3">
            {scheduleQuery.data.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--line)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <Badge>{item.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  {item.znCode} · {item.clientName}
                  {item.startTime ? ` · ${item.startTime}` : ''}
                  {item.locationName ? ` · ${item.locationName}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageScaffold>
  );
}
