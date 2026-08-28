import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Users } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { driverKeys, driversApi } from '../services/drivers.api';
import {
  Button,
  DialogShell,
  EmptyState,
  ErrorState,
  Input,
  Label,
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
import type {
  DriverDetail,
  DriverDutyStatus,
  DriverListItem,
  DriverReview,
  UnassignedBooking,
} from '@/shared/api/types';

function assignmentTone(status: string): StatusTone {
  if (status === 'pending') return 'warning';
  if (status === 'accepted' || status === 'active') return 'accent';
  if (status === 'in_progress') return 'success';
  if (status === 'rejected' || status === 'cancelled') return 'danger';
  if (status === 'completed') return 'default';
  return 'default';
}

function openAssignmentFromMe(me: DriverDetail) {
  const open = me.assignments?.find((a) =>
    ['pending', 'accepted', 'in_progress', 'active'].includes(a.status),
  );
  return open ?? me.activeAssignment ?? null;
}

const DUTY: DriverDutyStatus[] = ['available', 'en_route', 'resting', 'off_duty'];

const DUTY_LABEL: Record<string, string> = {
  available: 'AVAILABLE',
  en_route: 'EN ROUTE',
  resting: 'RESTING',
  off_duty: 'OFF DUTY',
};

function dutyTone(status: string): StatusTone {
  if (status === 'available') return 'success';
  if (status === 'en_route') return 'accent';
  if (status === 'resting') return 'warning';
  return 'default';
}

function vehicleLabel(d: Pick<DriverListItem, 'vehicleMake' | 'vehicleModel' | 'vehicleColor'>) {
  return [d.vehicleColor, d.vehicleMake, d.vehicleModel].filter(Boolean).join(' ') || '—';
}

function stars(rating: number) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
}

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ReviewsList({ items, empty }: { items: DriverReview[]; empty: string }) {
  if (!items.length) {
    return <p className="mt-1 text-sm text-[var(--ink-muted)]">{empty}</p>;
  }
  return (
    <ul className="mt-2 space-y-2">
      {items.map((review) => (
        <li
          key={review.id}
          className="rounded-lg border border-[var(--line)] px-3 py-2"
        >
          <p className="text-sm font-medium">
            {stars(review.rating)}{' '}
            <span className="text-[var(--ink-muted)]">
              {review.clientName}
              {review.znCode ? ` · ${review.znCode}` : ''}
            </span>
          </p>
          {review.comment ? (
            <p className="mt-1 text-sm">{review.comment}</p>
          ) : null}
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            {formatReviewDate(review.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function DriversRoster() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchOpen, setMatchOpen] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [driverId, setDriverId] = useState('');

  const listQuery = useQuery({
    queryKey: driverKeys.list({ status: statusFilter, limit: 100 }),
    queryFn: ({ signal }) =>
      driversApi.list(
        {
          page: 1,
          limit: 100,
          status: statusFilter || undefined,
        },
        signal,
      ),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const statsQuery = useQuery({
    queryKey: driverKeys.stats(),
    queryFn: ({ signal }) => driversApi.stats(signal),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const unassignedQuery = useQuery({
    queryKey: driverKeys.unassigned(),
    queryFn: ({ signal }) => driversApi.unassignedBookings(signal),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const detailQuery = useQuery({
    queryKey: driverKeys.detail(selectedId ?? ''),
    queryFn: ({ signal }) => driversApi.get(selectedId!, signal),
    enabled: Boolean(selectedId),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const scheduleQuery = useQuery({
    queryKey: driverKeys.schedule(selectedId ?? '', 'today'),
    queryFn: ({ signal }) => driversApi.schedule(selectedId!, 'today', signal),
    enabled: Boolean(selectedId),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const reviewsQuery = useQuery({
    queryKey: driverKeys.reviews(selectedId ?? ''),
    queryFn: ({ signal }) => driversApi.reviews(selectedId!, signal),
    enabled: Boolean(selectedId),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const drivers = useMemo(() => {
    const rows = listQuery.data?.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((d) =>
      `${d.user.fullName} ${d.user.phone ?? ''} ${d.plateNumber ?? ''} ${d.activeAssignment?.znCode ?? ''}`
        .toLowerCase()
        .includes(needle),
    );
  }, [listQuery.data, q]);
  const stats = statsQuery.data;
  const unassigned = useMemo(() => {
    const rows = unassignedQuery.data ?? [];
    return [...rows].sort((a, b) => Number(b.isVip) - Number(a.isVip));
  }, [unassignedQuery.data]);
  const available = drivers.filter((d) => d.status === 'available');

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DriverDutyStatus }) =>
      driversApi.update(id, { status }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('drivers.statusUpdated') });
      await qc.invalidateQueries({ queryKey: driverKeys.all });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      driversApi.assign({
        bookingId,
        driverId,
        startDate: todayIso(),
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('drivers.assigned') });
      setMatchOpen(false);
      setBookingId('');
      setDriverId('');
      await Promise.all([
        qc.invalidateQueries({ queryKey: driverKeys.all }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('drivers.assignFailed'),
      });
    },
  });

  return (
    <PageScaffold
      title={t('drivers.title')}
      description={t('drivers.description')}
      primaryAction={
        <Button type="button" onClick={() => setMatchOpen(true)}>
          {t('drivers.matchUnassigned', { count: stats?.unassignedBookings ?? unassigned.length })}
        </Button>
      }
      stats={
        <>
          <StatsCard
            label={t('drivers.available')}
            value={stats?.available ?? 0}
            tone="success"
          />
          <StatsCard
            label={t('drivers.enRoute')}
            value={stats?.enRoute ?? 0}
            tone="accent"
          />
          <StatsCard
            label={t('drivers.resting')}
            value={stats?.resting ?? 0}
            tone="warning"
          />
          <StatsCard label={t('drivers.offDuty')} value={stats?.offDuty ?? 0} />
        </>
      }
      filters={
        <div className="flex w-full flex-wrap items-center gap-2">
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder={t('drivers.searchPlaceholder')}
            className="max-w-sm"
          />
          <Select
            className="w-44"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('all')}</option>
            {DUTY.map((s) => (
              <option key={s} value={s}>
                {DUTY_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      {listQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : listQuery.isError ? (
        <ErrorState
          title={t('drivers.loadFailed')}
          description={
            listQuery.error instanceof ApiClientError ? listQuery.error.message : undefined
          }
          onRetry={() => void listQuery.refetch()}
        />
      ) : drivers.length === 0 ? (
        <EmptyState title={t('drivers.empty')} description={t('drivers.emptyHint')} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="grid gap-3 sm:grid-cols-2">
            {drivers.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                className={`rounded-[var(--radius)] border p-4 text-start shadow-[var(--shadow)] transition ${
                  selectedId === d.id
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{d.user.fullName}</p>
                    <p className="text-sm text-[var(--ink-muted)]">
                      {vehicleLabel(d)} · {d.plateNumber || '—'}
                    </p>
                  </div>
                  <StatusBadge tone={dutyTone(d.status)}>
                    {DUTY_LABEL[d.status] ?? d.status}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  ★ {d.rating} ({d.reviewsCount ?? 0}) · {d.tripsCount} {t('drivers.trips')}
                </p>
                {d.activeAssignment?.znCode ? (
                  <p className="mt-1 text-xs font-medium text-[var(--success)]">
                    {t('drivers.client')}: {d.activeAssignment.znCode}
                    {d.activeAssignment.clientName
                      ? ` · ${d.activeAssignment.clientName}`
                      : ''}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {t('drivers.noAssignment')}
                  </p>
                )}
                <div
                  className="mt-3"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Select
                    value={d.status}
                    disabled={statusMutation.isPending}
                    onChange={(e) =>
                      statusMutation.mutate({
                        id: d.id,
                        status: e.target.value as DriverDutyStatus,
                      })
                    }
                  >
                    {DUTY.map((s) => (
                      <option key={s} value={s}>
                        {DUTY_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </div>
              </button>
            ))}
          </div>

          <aside className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
            {!selectedId ? (
              <p className="text-sm text-[var(--ink-muted)]">{t('drivers.selectDriver')}</p>
            ) : detailQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : detailQuery.isError || !detailQuery.data ? (
              <ErrorState
                title={t('drivers.loadFailed')}
                onRetry={() => void detailQuery.refetch()}
              />
            ) : (
              <DriverWorkspace
                driver={detailQuery.data}
                scheduleItems={scheduleQuery.data?.items ?? []}
                reviews={reviewsQuery.data?.data ?? []}
              />
            )}
          </aside>
        </div>
      )}

      <DialogShell
        open={matchOpen}
        title={t('drivers.matchTitle')}
        onClose={() => {
          if (assignMutation.isPending) return;
          setMatchOpen(false);
        }}
        wide
      >
        <p className="mb-3 text-sm text-[var(--ink-muted)]">{t('drivers.matchHint')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">
              {t('drivers.unassignedClients')} ({unassigned.length})
            </p>
            <Select value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
              <option value="">{t('drivers.chooseBooking')}</option>
              {unassigned.map((b: UnassignedBooking) => (
                <option key={b.bookingId} value={b.bookingId}>
                  {b.isVip ? 'VIP · ' : ''}
                  {b.znCode} · {b.clientName}
                  {b.packageName ? ` · ${b.packageName}` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">
              {t('drivers.availableDrivers')} ({available.length})
            </p>
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">{t('drivers.chooseDriver')}</option>
              {available.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.fullName} · {d.plateNumber || vehicleLabel(d)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={assignMutation.isPending}
            onClick={() => setMatchOpen(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={!bookingId || !driverId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            {t('drivers.confirmAssign')}
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}

function DriverWorkspace({
  driver,
  scheduleItems,
  reviews,
}: {
  driver: DriverDetail;
  scheduleItems: Array<{
    id: string;
    title: string;
    startTime: string | null;
    locationName: string | null;
    znCode?: string;
    clientName?: string;
    status: string;
  }>;
  reviews: DriverReview[];
}) {
  const { t } = useTranslation();
  const assignment = openAssignmentFromMe(driver);

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-lg font-semibold">{driver.user.fullName}</p>
        <p className="text-[var(--ink-muted)]">
          {vehicleLabel(driver)} · {driver.plateNumber || '—'}
        </p>
        <p className="mt-1 text-sm">
          ★ {driver.rating}{' '}
          <span className="text-[var(--ink-muted)]">
            ({t('drivers.reviewsCount', { count: driver.reviewsCount ?? 0 })})
          </span>
        </p>
        {driver.user.phone ? (
          <a className="mt-1 inline-flex items-center gap-1 text-[var(--accent)]" href={`tel:${driver.user.phone}`}>
            <Phone className="h-3.5 w-3.5" /> {driver.user.phone}
          </a>
        ) : null}
      </div>

      <div className="rounded-xl bg-[var(--bg-muted)] p-3">
        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">
          {t('drivers.activeAssignment')}
        </p>
        {assignment ? (
          <>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="font-medium">
                {assignment.clientName} ({assignment.znCode})
              </p>
              {'status' in assignment && assignment.status ? (
                <StatusBadge tone={assignmentTone(assignment.status)}>
                  {assignment.status.replace(/_/g, ' ')}
                </StatusBadge>
              ) : null}
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              {assignment.startDate}
              {assignment.endDate ? ` → ${assignment.endDate}` : ''}
            </p>
            <Link
              to={`/clients/${assignment.bookingId}`}
              className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
            >
              {t('drivers.openBooking')}
            </Link>
          </>
        ) : (
          <p className="mt-1 text-[var(--ink-muted)]">{t('drivers.noAssignment')}</p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">
          {t('drivers.todaySchedule')}
        </p>
        {scheduleItems.length === 0 ? (
          <p className="mt-1 text-[var(--ink-muted)]">{t('drivers.noTrips')}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {scheduleItems.map((item) => (
              <li key={item.id} className="rounded-lg border border-[var(--line)] px-3 py-2">
                <p className="font-medium">
                  {item.startTime ? `${item.startTime.slice(0, 5)} · ` : ''}
                  {item.title}
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  {item.clientName}
                  {item.znCode ? ` (${item.znCode})` : ''}
                  {item.locationName ? ` · ${item.locationName}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">
          {t('drivers.reviews')}
        </p>
        <ReviewsList items={reviews} empty={t('drivers.noReviewsHint')} />
      </div>
    </div>
  );
}

function DriversTerminal() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const meQuery = useQuery({
    queryKey: driverKeys.me(),
    queryFn: ({ signal }) => driversApi.me(signal),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });

  const scheduleQuery = useQuery({
    queryKey: driverKeys.mySchedule('today'),
    queryFn: ({ signal }) => driversApi.mySchedule('today', signal),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const reviewsQuery = useQuery({
    queryKey: driverKeys.myReviews(),
    queryFn: ({ signal }) => driversApi.myReviews(signal),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const vehicleMutation = useMutation({
    mutationFn: (data: {
      vehicleMake: string;
      vehicleModel: string;
      vehicleColor?: string;
      vehicleYear?: number;
      plateNumber: string;
      whatsapp?: string;
    }) => driversApi.updateMyVehicle(data),
    onSuccess: async () => {
      push({ tone: 'success', title: t('drivers.vehicleSaved') });
      await qc.invalidateQueries({ queryKey: driverKeys.all });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('drivers.vehicleSaveFailed'),
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: DriverDutyStatus) => driversApi.myStatus(status),
    onSuccess: async () => {
      push({ tone: 'success', title: t('drivers.statusUpdated') });
      await qc.invalidateQueries({ queryKey: driverKeys.all });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const gpsMutation = useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => driversApi.myGps(lat, lng),
    onSuccess: () => push({ tone: 'success', title: t('drivers.gpsShared') }),
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('drivers.gpsFailed'),
      });
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: async ({
      action,
      id,
      reason,
    }: {
      action: 'accept' | 'reject' | 'start' | 'complete';
      id: string;
      reason?: string;
    }) => {
      if (action === 'accept') return driversApi.acceptAssignment(id);
      if (action === 'reject') return driversApi.rejectAssignment(id, reason ?? '');
      if (action === 'start') return driversApi.startAssignment(id);
      return driversApi.completeAssignment(id);
    },
    onSuccess: async (_, { action }) => {
      const titles = {
        accept: t('drivers.assignmentAccepted'),
        reject: t('drivers.assignmentRejected'),
        start: t('drivers.tripStarted'),
        complete: t('drivers.tripCompleted'),
      };
      push({ tone: 'success', title: titles[action] });
      setRejectOpen(false);
      setRejectReason('');
      await qc.invalidateQueries({ queryKey: driverKeys.all });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  function shareGps() {
    if (!navigator.geolocation) {
      push({ tone: 'error', title: t('drivers.gpsFailed') });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        gpsMutation.mutate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => push({ tone: 'error', title: t('drivers.gpsFailed') }),
    );
  }

  if (meQuery.isLoading) {
    return (
      <PageScaffold title={t('drivers.terminalTitle')} description={t('drivers.terminalDesc')}>
        <Skeleton className="h-40 w-full" />
      </PageScaffold>
    );
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <PageScaffold title={t('drivers.terminalTitle')} description={t('drivers.terminalDesc')}>
        <ErrorState
          title={t('drivers.loadFailed')}
          description={
            meQuery.error instanceof ApiClientError ? meQuery.error.message : undefined
          }
          onRetry={() => void meQuery.refetch()}
        />
      </PageScaffold>
    );
  }

  const me = meQuery.data;
  const assignment = openAssignmentFromMe(me);
  const assignmentStatus = assignment?.status ?? me.activeAssignment?.status;
  const nextStop = scheduleQuery.data?.items?.[0];
  const lifecycleBusy = lifecycleMutation.isPending;

  return (
    <PageScaffold
      title={t('drivers.terminalTitle')}
      description={t('drivers.terminalDesc')}
      stats={
        <>
          <StatsCard
            label={t('drivers.dutyStatus')}
            value={DUTY_LABEL[me.status] ?? me.status}
            tone={dutyTone(me.status)}
          />
          <StatsCard
            label={t('drivers.assignment')}
            value={assignment?.znCode ?? t('drivers.open')}
            tone="accent"
          />
          <StatsCard label={t('drivers.trips')} value={me.tripsCount} />
          <StatsCard
            label={t('drivers.rating')}
            value={`${me.rating} (${me.reviewsCount ?? 0})`}
          />
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            {t('drivers.assignedClient')}
          </p>
          {assignment ? (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{assignment.clientName}</h2>
                {assignmentStatus ? (
                  <StatusBadge tone={assignmentTone(assignmentStatus)}>
                    {assignmentStatus.replace(/_/g, ' ')}
                  </StatusBadge>
                ) : null}
              </div>
              <p className="text-sm text-[var(--ink-muted)]">{assignment.znCode}</p>
              {assignmentStatus === 'pending' ? (
                <p className="mt-2 text-sm text-[var(--ink-muted)]">{t('drivers.pendingHint')}</p>
              ) : null}
              <dl className="mt-4 space-y-3 text-sm">
                {assignment.clientPhone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden />
                    <a className="font-medium text-[var(--accent)]" href={`tel:${assignment.clientPhone}`}>
                      {assignment.clientPhone}
                  </a>
                </div>
                ) : null}
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" aria-hidden />
                  <div>
                    <p>
                      <span className="text-[var(--ink-muted)]">{t('drivers.dates')} · </span>
                      {assignment.startDate}
                      {assignment.endDate ? ` → ${assignment.endDate}` : ''}
                    </p>
                    {nextStop ? (
                    <p className="mt-1">
                        <span className="text-[var(--ink-muted)]">{t('drivers.nextStop')} · </span>
                        {nextStop.title}
                        {nextStop.locationName ? ` — ${nextStop.locationName}` : ''}
                    </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden />
                  <Link
                    to="/driver/me"
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {t('drivers.viewSchedule')}
                  </Link>
                </div>
              </dl>
              {assignment.clientPhone ? (
              <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => window.open(`tel:${assignment.clientPhone}`)}>
                    {t('drivers.callClient')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                    onClick={() =>
                      window.open(
                        `https://wa.me/${assignment.clientPhone!.replace(/\D/g, '')}`,
                        '_blank',
                      )
                    }
                >
                  WhatsApp
                </Button>
              </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                {assignmentStatus === 'pending' ? (
                  <>
                    <Button
                      type="button"
                      disabled={lifecycleBusy}
                      onClick={() =>
                        assignment?.id &&
                        lifecycleMutation.mutate({ action: 'accept', id: assignment.id })
                      }
                    >
                      {t('drivers.acceptAssignment')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={lifecycleBusy}
                      onClick={() => setRejectOpen(true)}
                    >
                      {t('drivers.rejectAssignment')}
                    </Button>
                  </>
                ) : null}
                {assignmentStatus === 'accepted' || assignmentStatus === 'active' ? (
                  <Button
                    type="button"
                    disabled={lifecycleBusy}
                    onClick={() => lifecycleMutation.mutate({ action: 'start', id: assignment.id })}
                  >
                    {t('drivers.startTrip')}
                  </Button>
                ) : null}
                {assignmentStatus === 'in_progress' ? (
                  <>
                    <Button
                      type="button"
                      disabled={lifecycleBusy}
                      onClick={() =>
                        lifecycleMutation.mutate({ action: 'complete', id: assignment.id })
                      }
                    >
                      {t('drivers.completeAssignment')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={gpsMutation.isPending}
                      onClick={shareGps}
                    >
                      {t('drivers.shareGps')}
                    </Button>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--ink-muted)]">{t('drivers.idleHint')}</p>
          )}
        </div>

        <div className="space-y-4">
          <DriverVehicleForm
            key={me.updatedAt}
            driver={me}
            saving={vehicleMutation.isPending}
            onSave={(data) => vehicleMutation.mutate(data)}
          />

          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              {t('drivers.dutyStatus')}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{t('drivers.dutyHint')}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DUTY.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate(status)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    me.status === status
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]'
                  }`}
                >
                  {DUTY_LABEL[status]}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full"
              disabled={gpsMutation.isPending}
              onClick={shareGps}
            >
              {t('drivers.shareGps')}
            </Button>
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              {t('drivers.reviews')}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{t('drivers.noReviewsHint')}</p>
            <ReviewsList
              items={reviewsQuery.data?.data ?? []}
              empty={t('drivers.noReviews')}
            />
          </div>
        </div>
      </div>

      <DialogShell
        open={rejectOpen}
        title={t('drivers.rejectTitle')}
        onClose={() => {
          if (lifecycleBusy) return;
          setRejectOpen(false);
          setRejectReason('');
        }}
      >
        <Label>{t('drivers.rejectReason')}</Label>
        <Input
          className="mt-2"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={t('drivers.rejectPlaceholder')}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={lifecycleBusy}
            onClick={() => {
              setRejectOpen(false);
              setRejectReason('');
            }}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={lifecycleBusy || !rejectReason.trim()}
            onClick={() =>
              assignment?.id &&
              lifecycleMutation.mutate({
                action: 'reject',
                id: assignment.id,
                reason: rejectReason.trim(),
              })
            }
          >
            {t('drivers.rejectConfirm')}
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}

function DriverVehicleForm({
  driver,
  saving,
  onSave,
}: {
  driver: DriverListItem;
  saving: boolean;
  onSave: (data: {
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor?: string;
    vehicleYear?: number;
    plateNumber: string;
    whatsapp?: string;
  }) => void;
}) {
  const { t } = useTranslation();
  const [make, setMake] = useState(driver.vehicleMake ?? '');
  const [model, setModel] = useState(driver.vehicleModel ?? '');
  const [color, setColor] = useState(driver.vehicleColor ?? '');
  const [year, setYear] = useState(driver.vehicleYear ? String(driver.vehicleYear) : '');
  const [plate, setPlate] = useState(driver.plateNumber ?? '');
  const [whatsapp, setWhatsapp] = useState(driver.whatsapp ?? '');

  const canSave = make.trim() && model.trim() && plate.trim();

  return (
    <form
      className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSave({
          vehicleMake: make.trim(),
          vehicleModel: model.trim(),
          vehicleColor: color.trim() || undefined,
          vehicleYear: year ? Number(year) : undefined,
          plateNumber: plate.trim(),
          whatsapp: whatsapp.trim() || undefined,
        });
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {t('drivers.vehicle')}
      </p>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{t('drivers.vehicleHint')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
          <Label htmlFor="vehicle-make">{t('drivers.make')}</Label>
          <Input
            id="vehicle-make"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            placeholder="Mercedes"
          />
              </div>
        <div>
          <Label htmlFor="vehicle-model">{t('drivers.model')}</Label>
          <Input
            id="vehicle-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="V-Class"
          />
            </div>
        <div>
          <Label htmlFor="vehicle-color">{t('drivers.color')}</Label>
          <Input
            id="vehicle-color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Black"
          />
      </div>
          <div>
          <Label htmlFor="vehicle-year">{t('drivers.year')}</Label>
          <Input
            id="vehicle-year"
            type="number"
            min={1990}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2024"
          />
          </div>
          <div>
          <Label htmlFor="vehicle-plate">{t('drivers.plate')}</Label>
          <Input
            id="vehicle-plate"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="A123BC77"
          />
        </div>
        <div>
          <Label htmlFor="vehicle-whatsapp">{t('drivers.whatsapp')}</Label>
          <Input
            id="vehicle-whatsapp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+7…"
          />
        </div>
      </div>
      <Button type="submit" className="mt-4 w-full" disabled={!canSave} loading={saving}>
        {t('save')}
      </Button>
    </form>
  );
}

export function DriversPage() {
  const { hasRole } = useAuth();
  if (hasRole('driver') && !hasRole('admin', 'ops_manager')) {
    return <DriversTerminal />;
  }
  return <DriversRoster />;
}
