import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Car,
  ClipboardList,
  Hotel,
  Package,
  Plus,
  Sparkles,
  Store,
  Ticket,
  Compass,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { operationsApi, type OpsActivity, type OpsBookingDetail } from '../services/operations.api';
import { usersApi } from '@/modules/admin/users/services/users.api';
import { bookingsApi } from '@/modules/clients/bookings/services/bookings.api';
import { dashboardApi } from '@/modules/command/dashboard/services/dashboard.api';
import {
  Button,
  DetailDrawer,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Pagination,
  SearchBar,
  Select,
  Skeleton,
  StatsCard,
  StatusBadge,
  TabBar,
  useToast,
  type StatusTone,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatMoney } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

type Board = 'master' | 'driver' | 'booking';
type DetailTab = 'info' | 'program' | 'payments' | 'chat' | 'checklist' | 'team' | 'actions';

function statusTone(status: string): StatusTone {
  if (
    status === 'paid' ||
    status === 'done' ||
    status === 'completed' ||
    status === 'approved' ||
    status === 'confirmed'
  ) {
    return 'success';
  }
  if (status === 'active') return 'accent';
  if (status === 'pending' || status === 'sent' || status === 'opened') return 'warning';
  if (status === 'cancelled' || status === 'failed' || status === 'rejected') return 'danger';
  return 'default';
}

function QrBox({ payload }: { payload: string }) {
  const enc = encodeURIComponent(payload);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${enc}`;
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-2">
      <img src={src} alt="Activity QR" width={120} height={120} className="mx-auto" />
    </div>
  );
}

function ActivityRow({
  activity,
  onConfirm,
}: {
  activity: OpsActivity;
  onConfirm: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [showQr, setShowQr] = useState(false);
  return (
    <div className="rounded-md bg-[var(--bg-muted)] px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {activity.startTime ? `${activity.startTime.slice(0, 5)} · ` : ''}
            {activity.title}
          </div>
          <div className="text-xs text-[var(--ink-muted)]">
            {[activity.locationName, activity.vendorName, activity.carPlan, activity.meetingPoint]
              .filter(Boolean)
              .join(' · ')}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {activity.pdfUrl ? (
              <a
                className="text-[var(--accent)] underline"
                href={activity.pdfUrl}
                target="_blank"
                rel="noreferrer"
              >
                PDF / Ticket
              </a>
            ) : null}
            <button
              type="button"
              className="text-[var(--accent)] underline"
              onClick={() => setShowQr((v) => !v)}
            >
              QR Code
            </button>
          </div>
          {showQr ? <div className="mt-2"><QrBox payload={activity.qrPayload} /></div> : null}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={statusTone(activity.status)}>
            {activity.status === 'pending' ? t('operations.notConfirmed') : activity.status}
          </StatusBadge>
          {activity.status === 'pending' ? (
            <Button type="button" variant="secondary" onClick={() => onConfirm(activity.id)}>
              {t('operations.confirm')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OperationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { push } = useToast();
  const qc = useQueryClient();
  const [board, setBoard] = useState<Board>('master');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('info');
  const [carPlan, setCarPlan] = useState('');
  const [dayNumber, setDayNumber] = useState(1);
  const [staffId, setStaffId] = useState('');
  const [staffRole, setStaffRole] = useState('coordinator');
  const [checklistTitle, setChecklistTitle] = useState('');

  const overviewQuery = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: ({ signal }) => dashboardApi.overview(signal),
    staleTime: 30_000,
  });

  const listQuery = useQuery({
    queryKey: ['operations', 'clients', { page, search: q }],
    queryFn: ({ signal }) =>
      operationsApi.clients({ page, limit: 20, search: q || undefined }, signal),
  });

  const urgentQuery = useQuery({
    queryKey: ['operations', 'urgent'],
    queryFn: ({ signal }) => operationsApi.urgent(signal),
    refetchInterval: 45_000,
  });

  const detailQuery = useQuery({
    queryKey: ['operations', 'booking', selectedId],
    queryFn: ({ signal }) => operationsApi.booking(selectedId!, signal),
    enabled: Boolean(selectedId),
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: ({ signal }) => usersApi.list(undefined, signal),
    enabled: Boolean(selectedId),
  });

  const saveDayPlan = useMutation({
    mutationFn: () =>
      operationsApi.upsertDayPlan(selectedId!, {
        dayNumber,
        carPlan: carPlan.trim() || undefined,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('operations.dayPlanSaved') });
      await qc.invalidateQueries({ queryKey: ['operations', 'booking', selectedId] });
    },
    onError: (err) =>
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      }),
  });

  const confirmItem = useMutation({
    mutationFn: (itemId: string) => operationsApi.updateItem(itemId, { status: 'active' }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('operations.confirmed') });
      await qc.invalidateQueries({ queryKey: ['operations'] });
    },
  });

  const addStaff = useMutation({
    mutationFn: () => operationsApi.addStaff(selectedId!, { staffId, role: staffRole }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('operations.staffLinked') });
      setStaffId('');
      await qc.invalidateQueries({ queryKey: ['operations', 'booking', selectedId] });
    },
    onError: (err) =>
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      }),
  });

  const addChecklist = useMutation({
    mutationFn: () => bookingsApi.addChecklist(selectedId!, { title: checklistTitle.trim() }),
    onSuccess: async () => {
      setChecklistTitle('');
      push({ tone: 'success', title: t('operations.checklistAdded') });
      await qc.invalidateQueries({ queryKey: ['operations', 'booking', selectedId] });
    },
  });

  const toggleChecklist = useMutation({
    mutationFn: (item: { id: string; isDone: boolean }) =>
      bookingsApi.patchChecklist(selectedId!, item.id, { isDone: !item.isDone }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['operations', 'booking', selectedId] });
    },
  });

  const clients = listQuery.data?.data ?? [];
  const urgent = urgentQuery.data ?? [];
  const detail = detailQuery.data;
  const k = overviewQuery.data?.summary;

  const staffOptions = useMemo(
    () => (usersQuery.data ?? []).filter((u) => u.isActive),
    [usersQuery.data],
  );

  const boardRows = useMemo(() => {
    if (board === 'driver') {
      return [...clients].sort((a, b) =>
        (a.driverName || 'zzz').localeCompare(b.driverName || 'zzz'),
      );
    }
    if (board === 'booking') {
      return [...clients].sort((a, b) => (a.arrivalDate || '').localeCompare(b.arrivalDate || ''));
    }
    return clients;
  }, [board, clients]);

  function openClient(id: string) {
    setSelectedId(id);
    setDetailTab('info');
  }

  return (
    <PageScaffold
      title={t('operations.title')}
      description={t('operations.description')}
      primaryAction={
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => navigate('/clients/new')}>
            <UserPlus className="me-1.5 h-4 w-4" />
            {t('operations.newClient')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/tasks')}>
            <Plus className="me-1.5 h-4 w-4" />
            {t('operations.addTask')}
          </Button>
        </div>
      }
      stats={
        <>
          <StatsCard
            label={t('operations.activeClients')}
            value={k?.activeClients ?? '—'}
            tone="accent"
            onClick={() => setBoard('master')}
          />
          <StatsCard
            label={t('operations.revenueToday')}
            value={k ? formatMoney(k.revenueToday) : '—'}
          />
          <StatsCard
            label={t('operations.driversInField')}
            value={k?.driversInField ?? '—'}
            onClick={() => navigate('/operations-room')}
          />
          <StatsCard
            label={t('operations.todaysItinerary')}
            value={k?.todaysItinerary ?? '—'}
            onClick={() => navigate('/daily-ops')}
          />
          <StatsCard
            label={t('operations.unassigned')}
            value={k?.unassignedClients ?? '—'}
            tone="warning"
            onClick={() => navigate('/drivers')}
          />
          <StatsCard
            label={t('operations.opsQueue')}
            value={k?.opsQueue ?? urgent.length}
            tone="warning"
          />
          <StatsCard
            label={t('operations.urgentTasks')}
            value={urgent.length}
            tone="danger"
          />
        </>
      }
    >
      {/* Excel: Quick Actions */}
      <section className="mb-4 flex flex-wrap gap-2">
        {[
          { to: '/clients/new', label: t('operations.newClient'), icon: UserPlus },
          { to: '/daily-ops', label: t('operations.dailyProgram'), icon: ClipboardList },
          { to: '/drivers', label: t('operations.driverTask'), icon: Car },
          { to: '/ai-parser', label: t('operations.aiAction'), icon: Sparkles },
          { to: '/tasks', label: t('operations.addTask'), icon: Plus },
          { to: '/vendors', label: t('operations.vendorMgmt'), icon: Store },
          { to: '/ai', label: t('nav.ai'), icon: Bot },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-sm hover:bg-[var(--bg-muted)]"
          >
            <a.icon className="h-3.5 w-3.5" />
            {a.label}
          </Link>
        ))}
      </section>

      {/* Excel: supplier tabs */}
      <section className="mb-4 flex flex-wrap gap-2">
        {[
          { to: '/hotels', label: t('nav.hotels'), icon: Hotel },
          { to: '/vendors', label: t('operations.restaurants'), icon: Store },
          { to: '/guides', label: t('nav.guides'), icon: Compass },
          { to: '/activities', label: t('nav.activities'), icon: Ticket },
          { to: '/services', label: t('nav.services'), icon: Wrench },
          { to: '/b2b-partners', label: t('nav.b2bPartners'), icon: Package },
          { to: '/splizer', label: t('operations.collectMan'), icon: ClipboardList },
        ].map((a) => (
          <Link
            key={a.to + a.label}
            to={a.to}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            <a.icon className="h-3 w-3" />
            {a.label}
          </Link>
        ))}
      </section>

      {/* Excel: Urgent Tasks */}
      {urgent.length > 0 ? (
        <section className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--danger)_35%,var(--line))] bg-[color-mix(in_srgb,var(--danger)_8%,var(--bg-elevated))] p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--danger)]">
            {t('operations.urgentTasks')}
          </h2>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {urgent.slice(0, 9).map((u) => (
              <button
                key={u.id}
                type="button"
                className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-start text-sm"
                onClick={() => openClient(u.bookingId)}
              >
                <div className="font-medium">
                  {u.znCode} · {u.clientName}
                </div>
                <div className="text-[var(--ink-muted)]">{u.title}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Excel: Driver / Booking / Master boards */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <TabBar
          value={board}
          onChange={(id) => setBoard(id as Board)}
          tabs={[
            { id: 'master', label: t('operations.masterBoard'), count: clients.length },
            { id: 'driver', label: t('operations.driverBoard') },
            { id: 'booking', label: t('operations.bookingBoard') },
          ]}
        />
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={t('operations.search')}
        />
      </div>

      {listQuery.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : listQuery.isError ? (
        <ErrorState title={t('operations.loadFailed')} onRetry={() => void listQuery.refetch()} />
      ) : boardRows.length === 0 ? (
        <EmptyState title={t('operations.empty')} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)]">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 text-start">{t('payments.zn')}</th>
                <th className="px-4 py-3 text-start">{t('common.client')}</th>
                <th className="px-4 py-3 text-start">{t('nav.packages')}</th>
                <th className="px-4 py-3 text-start">{t('common.date')}</th>
                <th className="px-4 py-3 text-start">{t('common.status')}</th>
                <th className="px-4 py-3 text-start">
                  {board === 'driver' ? t('nav.drivers') : t('operations.notConfirmed')}
                </th>
                <th className="px-4 py-3 text-start">{t('operations.created')}</th>
                <th className="px-4 py-3 text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {boardRows.map((c) => (
                <tr key={c.bookingId} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-mono text-xs">{c.znCode}</td>
                  <td className="px-4 py-3 font-medium">{c.clientName}</td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">{c.packageName || '—'}</td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    {c.arrivalDate || '—'} → {c.departureDate || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={statusTone(c.status)}>{c.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {board === 'driver' ? (
                      c.driverName || '—'
                    ) : c.notConfirmedTitles.length ? (
                      <StatusBadge tone="warning">
                        {c.notConfirmedTitles.slice(0, 2).join(', ')}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="success">{t('operations.allConfirmed')}</StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--ink-muted)]">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button type="button" variant="secondary" onClick={() => openClient(c.bookingId)}>
                      {t('operations.open')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-[var(--line)] px-4 py-3">
            <Pagination
              page={listQuery.data?.meta.page ?? page}
              limit={listQuery.data?.meta.limit ?? 20}
              total={listQuery.data?.meta.total ?? 0}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      <DetailDrawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={detail ? `${detail.znCode} · ${detail.clientName}` : t('operations.detail')}
        wide
      >
        {detailQuery.isLoading || !detail ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <OpsDetailBody
            detail={detail}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            dayNumber={dayNumber}
            setDayNumber={setDayNumber}
            carPlan={carPlan}
            setCarPlan={setCarPlan}
            staffId={staffId}
            setStaffId={setStaffId}
            staffRole={staffRole}
            setStaffRole={setStaffRole}
            staffOptions={staffOptions}
            checklistTitle={checklistTitle}
            setChecklistTitle={setChecklistTitle}
            onSaveDayPlan={() => saveDayPlan.mutate()}
            dayPlanPending={saveDayPlan.isPending}
            onConfirm={(id) => confirmItem.mutate(id)}
            onAddStaff={() => addStaff.mutate()}
            addStaffPending={addStaff.isPending}
            onAddChecklist={() => addChecklist.mutate()}
            onToggleChecklist={(item) => toggleChecklist.mutate(item)}
          />
        )}
      </DetailDrawer>
    </PageScaffold>
  );
}

function OpsDetailBody({
  detail,
  detailTab,
  setDetailTab,
  dayNumber,
  setDayNumber,
  carPlan,
  setCarPlan,
  staffId,
  setStaffId,
  staffRole,
  setStaffRole,
  staffOptions,
  checklistTitle,
  setChecklistTitle,
  onSaveDayPlan,
  dayPlanPending,
  onConfirm,
  onAddStaff,
  addStaffPending,
  onAddChecklist,
  onToggleChecklist,
}: {
  detail: OpsBookingDetail;
  detailTab: DetailTab;
  setDetailTab: (t: DetailTab) => void;
  dayNumber: number;
  setDayNumber: (n: number) => void;
  carPlan: string;
  setCarPlan: (v: string) => void;
  staffId: string;
  setStaffId: (v: string) => void;
  staffRole: string;
  setStaffRole: (v: string) => void;
  staffOptions: Array<{ id: string; fullName: string; role: string }>;
  checklistTitle: string;
  setChecklistTitle: (v: string) => void;
  onSaveDayPlan: () => void;
  dayPlanPending: boolean;
  onConfirm: (id: string) => void;
  onAddStaff: () => void;
  addStaffPending: boolean;
  onAddChecklist: () => void;
  onToggleChecklist: (item: { id: string; isDone: boolean }) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Excel client detail tabs */}
      <TabBar
        value={detailTab}
        onChange={(id) => setDetailTab(id as DetailTab)}
        tabs={[
          { id: 'info', label: t('operations.tabInfo') },
          { id: 'program', label: t('operations.tabProgram') },
          { id: 'payments', label: t('operations.tabPayments'), count: detail.payments.length },
          { id: 'chat', label: t('operations.tabChat') },
          {
            id: 'checklist',
            label: t('operations.tabChecklist'),
            count: detail.checklist.filter((c) => !c.isDone).length,
          },
          { id: 'team', label: t('operations.tabTeam') },
          { id: 'actions', label: t('operations.tabActions') },
        ]}
      />

      {detailTab === 'info' ? (
        <section className="space-y-3 text-sm">
          <h3 className="font-semibold">{t('operations.clientInfo')}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={t('common.name')} value={detail.clientName} />
            <Field label={t('payments.zn')} value={detail.znCode} mono />
            <Field label={t('common.phone')} value={detail.clientPhone} />
            <Field label={t('common.email')} value={detail.clientEmail || '—'} />
            <Field label={t('operations.nationality')} value={detail.nationality || '—'} />
            <Field label={t('operations.partySize')} value={String(detail.partySize)} />
            <Field label={t('nav.packages')} value={detail.packageName || '—'} />
            <Field
              label={t('operations.tripDates')}
              value={`${detail.arrivalDate || '—'} → ${detail.departureDate || '—'}`}
            />
            <Field label={t('operations.totalAmount')} value={formatMoney(detail.totalAmount)} />
            <Field label={t('operations.due')} value={formatMoney(detail.dueAmount)} />
            <Field label={t('nav.drivers')} value={detail.driverName || '—'} />
            <Field label={t('operations.coordinator')} value={detail.staff.find((s) => s.role === 'coordinator')?.staffName || '—'} />
          </div>
          {detail.internalNotes ? (
            <p className="rounded-lg bg-[var(--bg-muted)] p-3 text-xs text-[var(--ink-muted)]">
              {detail.internalNotes}
            </p>
          ) : null}
          {detail.editRequests.length ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--ink-muted)]">
                {t('nav.editRequests')}
              </h4>
              <div className="space-y-1">
                {detail.editRequests.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex justify-between text-xs">
                    <span>{e.type}</span>
                    <StatusBadge tone={statusTone(e.status)}>{e.status}</StatusBadge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {detailTab === 'program' ? (
        <section className="space-y-3">
          <div className="rounded-lg border border-[var(--line)] p-3">
            <h3 className="mb-2 text-sm font-semibold">{t('operations.dayPlan')}</h3>
            <div className="grid gap-2 sm:grid-cols-[90px_1fr_auto]">
              <div>
                <Label>{t('operations.day')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={dayNumber}
                  onChange={(e) => setDayNumber(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>{t('operations.carPlan')}</Label>
                <Input value={carPlan} onChange={(e) => setCarPlan(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="button" disabled={dayPlanPending} onClick={onSaveDayPlan}>
                  {t('save')}
                </Button>
              </div>
            </div>
          </div>

          {detail.days.map((day) => (
            <section key={day.dayNumber} className="rounded-lg border border-[var(--line)] p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {t('operations.day')} {day.dayNumber}
                  {day.planDate ? ` · ${day.planDate}` : ''}
                </h3>
                {day.notConfirmed.length ? (
                  <StatusBadge tone="warning">
                    {t('operations.notConfirmed')}: {day.notConfirmed.join(', ')}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="success">{t('operations.allConfirmed')}</StatusBadge>
                )}
              </div>
              {day.carPlan ? (
                <p className="mb-2 text-xs text-[var(--ink-muted)]">
                  {t('operations.carPlan')}: {day.carPlan}
                </p>
              ) : null}
              <div className="space-y-2">
                {day.activities.map((a) => (
                  <ActivityRow key={a.id} activity={a} onConfirm={onConfirm} />
                ))}
                {!day.activities.length ? (
                  <p className="text-xs text-[var(--ink-muted)]">{t('operations.noActivities')}</p>
                ) : null}
              </div>
            </section>
          ))}
        </section>
      ) : null}

      {detailTab === 'payments' ? (
        <section className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-[var(--bg-muted)] p-2">
              <div className="text-xs text-[var(--ink-muted)]">{t('operations.totalAmount')}</div>
              <div className="font-semibold">{formatMoney(detail.totalAmount)}</div>
            </div>
            <div className="rounded-lg bg-[var(--bg-muted)] p-2">
              <div className="text-xs text-[var(--ink-muted)]">{t('operations.paid')}</div>
              <div className="font-semibold">{formatMoney(detail.paidAmount)}</div>
            </div>
            <div className="rounded-lg bg-[var(--bg-muted)] p-2">
              <div className="text-xs text-[var(--ink-muted)]">{t('operations.due')}</div>
              <div className="font-semibold">{formatMoney(detail.dueAmount)}</div>
            </div>
          </div>
          {detail.payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border border-[var(--line)] px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{formatMoney(p.amount)}</div>
                <div className="text-xs text-[var(--ink-muted)]">
                  {p.method} · {new Date(p.createdAt).toLocaleString()}
                </div>
              </div>
              <StatusBadge tone={statusTone(p.status)}>{p.status}</StatusBadge>
            </div>
          ))}
          {!detail.payments.length ? <EmptyState title={t('operations.noPayments')} /> : null}
        </section>
      ) : null}

      {detailTab === 'chat' ? (
        <section className="space-y-3 text-sm">
          <p className="text-[var(--ink-muted)]">{t('operations.chatHint')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/chat')}>
              {t('operations.clientChat')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/chat')}>
              {t('operations.supportChat')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/operations-room')}>
              {t('operations.opsChat')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/client/login?zn=${encodeURIComponent(detail.znCode)}`)}
            >
              {t('operations.appLink')}
            </Button>
          </div>
        </section>
      ) : null}

      {detailTab === 'checklist' ? (
        <section className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={checklistTitle}
              onChange={(e) => setChecklistTitle(e.target.value)}
              placeholder={t('operations.checklistPlaceholder')}
            />
            <Button
              type="button"
              disabled={!checklistTitle.trim()}
              onClick={onAddChecklist}
            >
              {t('operations.addChecklist')}
            </Button>
          </div>
          {detail.checklist.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={c.isDone}
                onChange={() => onToggleChecklist(c)}
              />
              <span className={c.isDone ? 'text-[var(--ink-muted)] line-through' : ''}>
                {c.title}
              </span>
            </label>
          ))}
          {!detail.checklist.length ? <EmptyState title={t('operations.noChecklist')} /> : null}
        </section>
      ) : null}

      {detailTab === 'team' ? (
        <section className="space-y-3">
          <p className="text-xs text-[var(--ink-muted)]">{t('operations.teamHint')}</p>
          <div className="flex flex-wrap gap-2">
            {detail.staff.map((s) => (
              <StatusBadge key={s.id} tone="accent">
                {s.role}: {s.staffName}
              </StatusBadge>
            ))}
            {detail.driverName ? (
              <StatusBadge tone="success">
                driver: {detail.driverName}
                {detail.driverPhone ? ` · ${detail.driverPhone}` : ''}
              </StatusBadge>
            ) : null}
            {!detail.staff.length && !detail.driverName ? (
              <span className="text-xs text-[var(--ink-muted)]">{t('operations.noStaff')}</span>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
            <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">{t('operations.chooseStaff')}</option>
              {staffOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role})
                </option>
              ))}
            </Select>
            <Select value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
              <option value="coordinator">Coordinator</option>
              <option value="sales">Sales</option>
              <option value="guide">Guide</option>
              <option value="support">Support</option>
            </Select>
            <Button type="button" disabled={!staffId || addStaffPending} onClick={onAddStaff}>
              {t('operations.linkStaff')}
            </Button>
          </div>
        </section>
      ) : null}

      {detailTab === 'actions' ? (
        <section className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={() => navigate(`/bookings/${detail.bookingId}`)}>
            {t('operations.openBooking')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/edit-requests')}>
            {t('nav.editRequests')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/splizer')}>
            {t('nav.splizer')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/chat')}>
            {t('nav.chat')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/email')}>
            {t('nav.email')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/drivers')}>
            {t('operations.assignDriver')}
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">{label}</div>
      <div className={mono ? 'font-mono text-xs' : 'font-medium'}>{value}</div>
    </div>
  );
}
