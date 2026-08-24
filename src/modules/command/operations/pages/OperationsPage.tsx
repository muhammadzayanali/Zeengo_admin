import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { operationsApi } from '../services/operations.api';
import { usersApi } from '@/modules/admin/users/services/users.api';
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
  StatusBadge,
  useToast,
  type StatusTone,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

function statusTone(status: string): StatusTone {
  if (status === 'done' || status === 'confirmed' || status === 'completed') return 'success';
  if (status === 'active') return 'accent';
  if (status === 'pending') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'default';
}

export function OperationsPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [carPlan, setCarPlan] = useState('');
  const [dayNumber, setDayNumber] = useState(1);
  const [staffId, setStaffId] = useState('');
  const [staffRole, setStaffRole] = useState('coordinator');

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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['operations'] }),
      ]);
    },
  });

  const addStaff = useMutation({
    mutationFn: () =>
      operationsApi.addStaff(selectedId!, { staffId, role: staffRole }),
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

  const clients = listQuery.data?.data ?? [];
  const urgent = urgentQuery.data ?? [];
  const detail = detailQuery.data;

  const staffOptions = useMemo(
    () => (usersQuery.data ?? []).filter((u) => u.isActive),
    [usersQuery.data],
  );

  return (
    <PageScaffold
      title={t('operations.title')}
      description={t('operations.description')}
      filters={
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={t('operations.search')}
        />
      }
    >
      {urgent.length > 0 ? (
        <section className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--danger)_35%,var(--line))] bg-[color-mix(in_srgb,var(--danger)_8%,var(--bg-elevated))] p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--danger)]">
            {t('operations.urgentTasks')}
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {urgent.slice(0, 6).map((u) => (
              <button
                key={u.id}
                type="button"
                className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-start text-sm"
                onClick={() => setSelectedId(u.bookingId)}
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

      {listQuery.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : listQuery.isError ? (
        <ErrorState title={t('operations.loadFailed')} onRetry={() => void listQuery.refetch()} />
      ) : clients.length === 0 ? (
        <EmptyState title={t('operations.empty')} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)]">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 text-start">{t('payments.zn')}</th>
                <th className="px-4 py-3 text-start">{t('common.client')}</th>
                <th className="px-4 py-3 text-start">{t('nav.packages')}</th>
                <th className="px-4 py-3 text-start">{t('operations.progress')}</th>
                <th className="px-4 py-3 text-start">{t('operations.notConfirmed')}</th>
                <th className="px-4 py-3 text-start">{t('operations.coordinator')}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.bookingId}
                  className="cursor-pointer border-t border-[var(--line)] hover:bg-[var(--bg-muted)]"
                  onClick={() => setSelectedId(c.bookingId)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{c.znCode}</td>
                  <td className="px-4 py-3 font-medium">{c.clientName}</td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">{c.packageName || '—'}</td>
                  <td className="px-4 py-3">
                    {c.totalItems - c.pendingItems}/{c.totalItems}
                  </td>
                  <td className="px-4 py-3">
                    {c.notConfirmedTitles.length ? (
                      <StatusBadge tone="warning">
                        {c.notConfirmedTitles.slice(0, 2).join(', ')}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="success">{t('operations.allConfirmed')}</StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    {c.coordinatorName || '—'}
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
      >
        {detailQuery.isLoading || !detail ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-[var(--ink-muted)]">
              {detail.packageName || '—'} · {detail.partySize} pax · {detail.arrivalDate || '—'} →{' '}
              {detail.departureDate || '—'}
            </div>

            <section className="space-y-2 rounded-lg border border-[var(--line)] p-3">
              <h3 className="text-sm font-semibold">{t('operations.teamLinks')}</h3>
              <div className="flex flex-wrap gap-2">
                {detail.staff.map((s) => (
                  <StatusBadge key={s.id} tone="accent">
                    {s.role}: {s.staffName}
                  </StatusBadge>
                ))}
                {!detail.staff.length ? (
                  <span className="text-xs text-[var(--ink-muted)]">{t('operations.noStaff')}</span>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
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
                <Button
                  type="button"
                  disabled={!staffId || addStaff.isPending}
                  onClick={() => addStaff.mutate()}
                >
                  {t('operations.linkStaff')}
                </Button>
              </div>
            </section>

            <section className="space-y-2 rounded-lg border border-[var(--line)] p-3">
              <h3 className="text-sm font-semibold">{t('operations.dayPlan')}</h3>
              <div className="grid gap-2 sm:grid-cols-[100px_1fr_auto]">
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
                  <Button
                    type="button"
                    disabled={saveDayPlan.isPending}
                    onClick={() => saveDayPlan.mutate()}
                  >
                    {t('save')}
                  </Button>
                </div>
              </div>
            </section>

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
                    <div
                      key={a.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-md bg-[var(--bg-muted)] px-3 py-2"
                    >
                      <div>
                        <div className="font-medium">
                          {a.startTime ? `${a.startTime.slice(0, 5)} · ` : ''}
                          {a.title}
                        </div>
                        <div className="text-xs text-[var(--ink-muted)]">
                          {[a.locationName, a.vendorName, a.carPlan, a.meetingPoint]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                        {a.pdfUrl ? (
                          <a
                            className="text-xs text-[var(--accent)] underline"
                            href={a.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            PDF
                          </a>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={statusTone(a.status)}>{a.status}</StatusBadge>
                        {a.status === 'pending' ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => confirmItem.mutate(a.id)}
                          >
                            {t('operations.confirm')}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!day.activities.length ? (
                    <p className="text-xs text-[var(--ink-muted)]">{t('operations.noActivities')}</p>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        )}
      </DetailDrawer>
    </PageScaffold>
  );
}
