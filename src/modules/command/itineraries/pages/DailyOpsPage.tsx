import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itinerariesApi } from '../services/itineraries.api';
import {
  EmptyState,
  ErrorState,
  PageScaffold,
  SearchBar,
  Select,
  Skeleton,
  StatsCard,
  StatusBadge,
  useToast,
  type StatusTone,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { DailyOperationItem } from '@/shared/api/types';

const statusTone: Record<string, StatusTone> = {
  pending: 'default',
  active: 'accent',
  done: 'success',
  cancelled: 'danger',
};

function timeBlock(startTime: string | null): 'morning' | 'afternoon' | 'evening' | 'unscheduled' {
  if (!startTime) return 'unscheduled';
  const hour = Number(startTime.slice(0, 2));
  if (!Number.isFinite(hour)) return 'unscheduled';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function DailyOpsPage() {
  const { push } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayIso);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  const dayQuery = useQuery({
    queryKey: ['daily-operations', date],
    queryFn: ({ signal }) => itinerariesApi.dailyOps(date, signal),
    staleTime: 15_000,
    refetchInterval: 45_000,
  });

  const items = dayQuery.data?.items ?? [];

  const filtered = useMemo(() => {
    return items.filter((t) => {
      if (status && t.status !== status) return false;
      const hay = `${t.title} ${t.znCode} ${t.clientName} ${t.locationName ?? ''} ${t.driverName ?? ''}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, status, q]);

  const blocks = ['morning', 'afternoon', 'evening', 'unscheduled'] as const;

  const progress =
    dayQuery.data && dayQuery.data.itemCount > 0
      ? Math.round((dayQuery.data.doneCount / dayQuery.data.itemCount) * 100)
      : 0;

  const toggle = useMutation({
    mutationFn: async (item: DailyOperationItem) => {
      const next = item.status === 'done' ? 'pending' : 'done';
      return itinerariesApi.updateItem(item.id, { status: next });
    },
    onSuccess: () => {
      push({ tone: 'success', title: 'Itinerary item updated' });
      qc.invalidateQueries({ queryKey: ['daily-operations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : 'Update failed',
      });
    },
  });

  return (
    <PageScaffold
      title="Daily Operations"
      description="Today’s itinerary fulfillment board — mark stops done to track progress."
      stats={
        dayQuery.data ? (
          <>
            <StatsCard label="Itinerary progress" value={`${progress}%`} />
            <StatsCard label="Pending" value={dayQuery.data.pendingCount} />
            <StatsCard label="In progress" value={dayQuery.data.activeCount} tone="accent" />
            <StatsCard label="Done" value={dayQuery.data.doneCount} tone="success" />
          </>
        ) : undefined
      }
      filters={
        <>
          <input
            type="date"
            className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Search task, client, venue…"
            className="max-w-sm"
          />
          <Select
            className="max-w-[180px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </>
      }
    >
      {dayQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : dayQuery.isError ? (
        <ErrorState
          description={dayQuery.error?.message ?? 'Could not load daily operations'}
          onRetry={() => dayQuery.refetch()}
        />
      ) : !items.length ? (
        <EmptyState
          title="No itinerary items for this day"
          description="Add program items on bookings, then they appear here for the selected date."
        />
      ) : !filtered.length ? (
        <EmptyState title="No items match filters" />
      ) : (
        blocks.map((block) => {
          const rows = filtered.filter((t) => timeBlock(t.startTime) === block);
          if (!rows.length) return null;
          return (
            <section key={block} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                {block}
              </h3>
              <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                    <tr>
                      <th className="px-3 py-2 text-start">Done</th>
                      <th className="px-3 py-2 text-start">Task</th>
                      <th className="px-3 py-2 text-start">Client</th>
                      <th className="px-3 py-2 text-start">Driver</th>
                      <th className="px-3 py-2 text-start">Location</th>
                      <th className="px-3 py-2 text-start">Time</th>
                      <th className="px-3 py-2 text-start">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => (
                      <tr
                        key={t.id}
                        className="border-t border-[var(--line)] hover:bg-[var(--bg-muted)]/70"
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={t.status === 'done'}
                            disabled={toggle.isPending}
                            onChange={() => toggle.mutate(t)}
                            aria-label={`Complete ${t.title}`}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{t.title}</td>
                        <td className="px-3 py-2">
                          <span className="font-medium">{t.znCode}</span>
                          <span className="ms-1 text-[var(--ink-muted)]">{t.clientName}</span>
                        </td>
                        <td className="px-3 py-2">{t.driverName ?? '—'}</td>
                        <td className="px-3 py-2 text-[var(--ink-muted)]">
                          {t.locationName ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-[var(--ink-muted)]">
                          {t.startTime?.slice(0, 5) ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge tone={statusTone[t.status] ?? 'default'}>
                            {t.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </PageScaffold>
  );
}
