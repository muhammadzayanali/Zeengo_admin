import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { itinerariesApi } from '../services/itineraries.api';
import {
  Card,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Skeleton,
  StatsCard,
  StatusBadge,
} from '@/shared/ui';
import { formatDate } from '@/shared/lib/cn';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function mondayOf(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().slice(0, 10);
}

export function DailyOpsPage() {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayIso());
  const weekStart = useMemo(() => mondayOf(date), [date]);

  const dailyQuery = useQuery({
    queryKey: ['daily-ops', date],
    queryFn: ({ signal }) => itinerariesApi.dailyOps(date, signal),
  });

  const weekQuery = useQuery({
    queryKey: ['daily-ops', 'week', weekStart],
    queryFn: ({ signal }) => itinerariesApi.weekOps(weekStart, signal),
  });

  return (
    <PageScaffold
      title={t('dailyOps.title')}
      description={t('dailyOps.description')}
      stats={
        dailyQuery.data ? (
          <>
            <StatsCard
              label={t('common.pending')}
              value={dailyQuery.data.pendingCount}
              tone="warning"
            />
            <StatsCard
              label={t('common.active')}
              value={dailyQuery.data.activeCount}
              tone="accent"
            />
            <StatsCard
              label={t('common.done')}
              value={dailyQuery.data.doneCount}
              tone="success"
            />
          </>
        ) : undefined
      }
      filters={
        <>
          <Label htmlFor="opsDate">{t('common.date')}</Label>
          <Input
            id="opsDate"
            type="date"
            className="max-w-xs"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h2 className="mb-4 text-lg font-bold">{formatDate(date)}</h2>
          {dailyQuery.isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : dailyQuery.isError ? (
            <ErrorState
              description={t('dailyOps.loadFailed')}
              onRetry={() => dailyQuery.refetch()}
            />
          ) : !dailyQuery.data?.items.length ? (
            <EmptyState title={t('dailyOps.empty')} description={t('dailyOps.emptyHint')} />
          ) : (
            <div className="flex flex-col gap-3">
              {dailyQuery.data.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-[var(--line)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{item.title}</p>
                    <StatusBadge>{item.status}</StatusBadge>
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

        <Card>
          <h2 className="text-lg font-bold">{t('dailyOps.weekCounters')}</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {t('dailyOps.weekOf', { date: formatDate(weekStart) })}
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {weekQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : weekQuery.isError ? (
              <ErrorState
                description={t('dailyOps.weekFailed')}
                onRetry={() => weekQuery.refetch()}
              />
            ) : (() => {
              const days = Array.isArray(weekQuery.data)
                ? weekQuery.data
                : weekQuery.data?.days ?? [];
              if (!days.length) return <EmptyState title={t('dailyOps.noWeek')} />;
              return days.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{formatDate(day.date)}</span>
                  <span className="text-[var(--ink-muted)]">
                    {t('dailyOps.items', { count: day.itemCount })}
                  </span>
                </div>
              ));
            })()}
          </div>
        </Card>
      </div>
    </PageScaffold>
  );
}
