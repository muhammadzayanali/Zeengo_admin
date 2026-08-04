import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Car,
  Wallet,
  ListTodo,
  Siren,
  CalendarRange,
  Plus,
  FileText,
  UserPlus,
} from 'lucide-react';
import { dashboardApi } from '../services/dashboard.api';
import { driversApi } from '@/features/drivers/services/drivers.api';
import { financeApi } from '@/features/finance/services/finance.api';
import { notificationsApi } from '@/features/notifications/services/notifications.api';
import { sosApi } from '@/features/sos/services/sos.api';
import {
  AnalyticsCard,
  Button,
  DriverCard,
  ErrorState,
  NotificationPanel,
  PageScaffold,
  Skeleton,
  StatsCard,
  StatusBadge,
  Timeline,
  useToast,
  type StatusTone,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatMoney } from '@/shared/lib/cn';

function driverTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s.includes('available') || s === 'online') return 'success';
  if (s.includes('route') || s.includes('busy') || s.includes('assigned')) return 'accent';
  if (s.includes('rest') || s.includes('break')) return 'warning';
  return 'default';
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [scheduleDate, setScheduleDate] = useState<'today' | 'tomorrow'>('today');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [creatingEod, setCreatingEod] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: ({ signal }) => dashboardApi.summary(signal),
    refetchInterval: 60_000,
  });

  const alertsQuery = useQuery({
    queryKey: ['dashboard', 'urgent-alerts'],
    queryFn: ({ signal }) => dashboardApi.urgentAlerts(signal),
    refetchInterval: 60_000,
  });

  const scheduleQuery = useQuery({
    queryKey: ['dashboard', 'schedule', scheduleDate],
    queryFn: ({ signal }) => dashboardApi.schedule(scheduleDate, signal),
  });

  const driversQuery = useQuery({
    queryKey: ['drivers', 'board'],
    queryFn: ({ signal }) => driversApi.list({ page: 1, limit: 24 }, signal),
    refetchInterval: 60_000,
  });

  const financeQuery = useQuery({
    queryKey: ['finance', 'revenue-by-method'],
    queryFn: ({ signal }) => financeApi.revenueByMethod(14, signal),
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'dashboard'],
    queryFn: ({ signal }) => notificationsApi.list({ page: 1, limit: 6 }, signal),
    refetchInterval: 60_000,
  });

  const sosQuery = useQuery({
    queryKey: ['sos', 'dashboard-count'],
    queryFn: ({ signal }) => sosApi.list({ page: 1, limit: 1, status: 'active' }, signal),
    refetchInterval: 30_000,
  });

  const summary = summaryQuery.data;
  const sosCount = sosQuery.data?.meta.total ?? 0;

  const timelineItems = useMemo(
    () =>
      (scheduleQuery.data ?? []).slice(0, 12).map((item) => ({
        id: item.id,
        time: item.startTime ?? undefined,
        title: item.title || item.clientName,
        description: `${item.znCode} · ${item.clientName}${item.locationName ? ` · ${item.locationName}` : ''}`,
        tone:
          item.status === 'done'
            ? ('success' as const)
            : item.status === 'pending'
              ? ('warning' as const)
              : ('accent' as const),
      })),
    [scheduleQuery.data],
  );

  const revenueBars = useMemo(() => {
    const list = financeQuery.data?.byMethod ?? [];
    const amounts = list.map((m) => ({
      label: m.method,
      amount: Number(m.amount ?? 0),
    }));
    const max = Math.max(...amounts.map((a) => a.amount), 1);
    return amounts.slice(0, 6).map((a) => ({ ...a, pct: Math.round((a.amount / max) * 100) }));
  }, [financeQuery.data]);

  async function handleCreateEod() {
    setCreatingEod(true);
    try {
      await dashboardApi.createEod();
      push({ tone: 'success', title: t('dashboard.eodSuccess') });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) {
      push({
        tone: 'error',
        title: t('dashboard.eodFailed'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setCreatingEod(false);
    }
  }

  if (summaryQuery.isError) {
    return (
      <ErrorState
        title={t('dashboard.loadFailed')}
        onRetry={() => summaryQuery.refetch()}
      />
    );
  }

  const contextOpen = Boolean(selectedDriverId || selectedTimelineId);
  const selectedDriver = driversQuery.data?.data.find((d) => d.id === selectedDriverId);

  return (
    <PageScaffold
      title={t('dashboard.title')}
      description={t('dashboard.description')}
      primaryAction={
        <>
          <Button type="button" variant="secondary" onClick={() => navigate('/sos')}>
            <Siren className="h-4 w-4" />
            SOS
            {sosCount > 0 ? (
              <StatusBadge tone="danger">{sosCount}</StatusBadge>
            ) : null}
          </Button>
          <Button type="button" loading={creatingEod} onClick={() => void handleCreateEod()}>
            <FileText className="h-4 w-4" />
            {t('dashboard.generateEod')}
          </Button>
        </>
      }
      className={contextOpen ? 'xl:pe-[300px]' : undefined}
    >
      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryQuery.isLoading || !summary ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-full rounded-[var(--radius)]" />
          ))
        ) : (
          <>
            <StatsCard
              label={t('dashboard.activeClients')}
              value={summary.activeClients}
              icon={<Users className="h-4 w-4" />}
              onClick={() => navigate('/clients')}
            />
            <StatsCard
              label={t('dashboard.driversInField')}
              value={summary.driversInField}
              tone="accent"
              icon={<Car className="h-4 w-4" />}
              onClick={() => navigate('/drivers')}
            />
            <StatsCard
              label={t('dashboard.revenueToday')}
              value={formatMoney(summary.revenueToday)}
              tone="success"
              icon={<Wallet className="h-4 w-4" />}
              onClick={() => navigate('/finance')}
            />
            <StatsCard
              label={t('dashboard.urgentTasks')}
              value={summary.urgentTasks}
              tone={summary.urgentTasks > 0 ? 'warning' : 'default'}
              icon={<ListTodo className="h-4 w-4" />}
              onClick={() => navigate('/tasks')}
            />
            <StatsCard
              label={t('nav.sos')}
              value={sosCount}
              tone={sosCount > 0 ? 'danger' : 'default'}
              hint={sosCount > 0 ? 'Requires immediate attention' : 'All clear'}
              icon={<Siren className="h-4 w-4" />}
              onClick={() => navigate('/sos')}
            />
            <StatsCard
              label={t('dashboard.todaysItinerary')}
              value={summary.todaysItinerary}
              icon={<CalendarRange className="h-4 w-4" />}
              onClick={() => navigate('/daily-ops')}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {/* Today's Timeline */}
        <AnalyticsCard
          className="xl:col-span-3"
          title="Today's timeline"
          description="Live itinerary pulse for the selected day"
          action={
            <div className="flex gap-1 rounded-lg bg-[var(--bg-muted)] p-0.5">
              {(['today', 'tomorrow'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setScheduleDate(d)}
                  className={
                    scheduleDate === d
                      ? 'rounded-md bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--ink)] shadow-sm'
                      : 'px-2.5 py-1 text-xs font-medium text-[var(--ink-muted)]'
                  }
                >
                  {d === 'today' ? t('today') : t('tomorrow')}
                </button>
              ))}
            </div>
          }
        >
          {scheduleQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Timeline
              items={timelineItems}
              empty={t('common.noData')}
              onSelect={(id) => setSelectedTimelineId(id)}
            />
          )}
        </AnalyticsCard>

        {/* Driver Status Board */}
        <AnalyticsCard
          className="xl:col-span-2"
          title="Driver status board"
          description="Availability across the fleet"
          action={
            <Link to="/drivers" className="text-xs font-medium text-[var(--accent)]">
              View all
            </Link>
          }
        >
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {driversQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (driversQuery.data?.data.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--ink-muted)]">{t('common.noData')}</p>
            ) : (
              driversQuery.data!.data.map((d) => (
                <DriverCard
                  key={d.id}
                  name={d.user.fullName}
                  vehicle={[d.vehicleMake, d.vehicleModel, d.plateNumber].filter(Boolean).join(' · ')}
                  status={d.status}
                  statusTone={driverTone(d.status)}
                  selected={selectedDriverId === d.id}
                  onClick={() => setSelectedDriverId(d.id)}
                />
              ))
            )}
          </div>
        </AnalyticsCard>
      </div>

      {/* Revenue + Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsCard
          title="Revenue analytics"
          description="Mix by payment method (last 14 days)"
          action={
            <Link to="/finance" className="text-xs font-medium text-[var(--accent)]">
              Finance
            </Link>
          }
        >
          {financeQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : revenueBars.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--ink-muted)]">{t('common.noData')}</p>
          ) : (
            <div className="space-y-3">
              {revenueBars.map((bar) => (
                <div key={bar.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-[var(--ink)]">{bar.label}</span>
                    <span className="text-[var(--ink-muted)]">{formatMoney(bar.amount)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title={t('dashboard.urgentAlerts')}
          description="Recent operational signals"
          action={
            <Link to="/edit-requests" className="text-xs font-medium text-[var(--accent)]">
              Edit requests
            </Link>
          }
        >
          {alertsQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (alertsQuery.data?.length ?? 0) === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--ink-muted)]">{t('dashboard.noAlerts')}</p>
          ) : (
            <Timeline
              items={(alertsQuery.data ?? []).map((a, idx) => ({
                id: `${a.type}-${a.entityId ?? idx}`,
                time: a.createdAt ? new Date(a.createdAt).toLocaleTimeString() : undefined,
                title: a.title,
                description: a.message,
                tone:
                  a.severity === 'high'
                    ? 'danger'
                    : a.severity === 'medium'
                      ? 'warning'
                      : 'default',
              }))}
            />
          )}
        </AnalyticsCard>
      </div>

      {/* Notifications + Quick actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ink)]">{t('nav.notifications')}</h3>
            <Link to="/notifications" className="text-xs font-medium text-[var(--accent)]">
              Open inbox
            </Link>
          </div>
          <NotificationPanel
            items={(notificationsQuery.data?.data ?? []).map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body ?? undefined,
              time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString() : undefined,
              unread: !n.isRead,
            }))}
            empty={t('common.noData')}
          />
        </div>

        <AnalyticsCard title="Quick actions" description="High-frequency dispatch moves">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/drivers')}>
              <UserPlus className="h-4 w-4" />
              Assign driver
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/sos')}>
              <Siren className="h-4 w-4" />
              Open SOS
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/bookings')}>
              <Plus className="h-4 w-4" />
              New booking
            </Button>
            <Button type="button" variant="secondary" loading={creatingEod} onClick={() => void handleCreateEod()}>
              <FileText className="h-4 w-4" />
              End of day
            </Button>
          </div>
          {summary ? (
            <p className="mt-4 text-xs text-[var(--ink-muted)]">
              Unassigned clients: <strong className="text-[var(--ink)]">{summary.unassignedClients}</strong>
              {' · '}
              Ops queue: <strong className="text-[var(--ink)]">{summary.opsQueue}</strong>
            </p>
          ) : null}
        </AnalyticsCard>
      </div>

      {/* Right context panel */}
      {contextOpen ? (
        <aside className="fixed inset-y-16 end-0 z-20 hidden w-[280px] overflow-y-auto border-s border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)] xl:block">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Context</h3>
            <button
              type="button"
              className="text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
              onClick={() => {
                setSelectedDriverId(null);
                setSelectedTimelineId(null);
              }}
            >
              Close
            </button>
          </div>
          {selectedDriver ? (
            <div className="space-y-3">
              <DriverCard
                name={selectedDriver.user.fullName}
                vehicle={[selectedDriver.vehicleMake, selectedDriver.plateNumber]
                  .filter(Boolean)
                  .join(' · ')}
                status={selectedDriver.status}
                statusTone={driverTone(selectedDriver.status)}
              />
              <Button
                type="button"
                className="w-full"
                onClick={() => navigate(`/drivers`)}
              >
                Open driver profile
              </Button>
            </div>
          ) : null}
          {selectedTimelineId ? (
            <p className="mt-3 text-xs text-[var(--ink-muted)]">
              Selected itinerary item: {selectedTimelineId}
            </p>
          ) : null}
        </aside>
      ) : null}
    </PageScaffold>
  );
}
