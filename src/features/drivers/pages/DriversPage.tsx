import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { driversApi } from '../services/drivers.api';
import {
  Button,
  Card,
  DialogShell,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Pagination,
  SearchBar,
  Skeleton,
  StatsCard,
  StatusBadge,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

export function DriversPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [assignOpen, setAssignOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const driversQuery = useQuery({
    queryKey: ['drivers', { page, search: debouncedSearch }],
    queryFn: ({ signal }) =>
      driversApi.list({ page, limit: 20, search: debouncedSearch || undefined }, signal),
  });

  const positionsQuery = useQuery({
    queryKey: ['drivers', 'live-positions'],
    queryFn: ({ signal }) => driversApi.livePositions(signal),
    refetchInterval: 30_000,
  });

  const availableCount = useMemo(
    () => (driversQuery.data?.data ?? []).filter((d) => d.status === 'available').length,
    [driversQuery.data],
  );

  async function handleAssign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await driversApi.assign({
        bookingId: String(form.get('bookingId') || ''),
        driverId: String(form.get('driverId') || ''),
        startDate: String(form.get('startDate') || ''),
        endDate: String(form.get('endDate') || '') || undefined,
      });
      push({ tone: 'success', title: t('drivers.assigned') });
      setAssignOpen(false);
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('drivers.assignFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageScaffold
      title={t('drivers.title')}
      description={t('drivers.description')}
      primaryAction={<Button onClick={() => setAssignOpen(true)}>{t('drivers.assign')}</Button>}
      stats={
        driversQuery.data ? (
          <>
            <StatsCard label={t('bookings.total')} value={driversQuery.data.meta.total} />
            <StatsCard label={t('common.active')} value={availableCount} tone="success" />
            <StatsCard
              label={t('drivers.livePositions')}
              value={positionsQuery.data?.length ?? 0}
              tone="accent"
            />
          </>
        ) : undefined
      }
      filters={
        <SearchBar
          className="max-w-xs"
          placeholder={t('drivers.searchPlaceholder')}
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      }
    >
      <Card>
        <h2 className="text-lg font-bold">{t('drivers.livePositions')}</h2>
        <div className="mt-4 flex flex-col gap-2">
          {positionsQuery.isLoading ? (
            <Skeleton className="h-10" />
          ) : !positionsQuery.data?.length ? (
            <p className="text-sm text-[var(--ink-muted)]">{t('drivers.noGps')}</p>
          ) : (
            positionsQuery.data.map((pos) => (
              <div
                key={pos.driverId}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              >
                <span className="font-semibold">{pos.driverName}</span>
                <span className="text-[var(--ink-muted)]">
                  {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
                </span>
                <StatusBadge tone="accent">{pos.status}</StatusBadge>
              </div>
            ))
          )}
        </div>
      </Card>

      {driversQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : driversQuery.isError ? (
        <ErrorState
          description={t('drivers.loadFailed')}
          onRetry={() => driversQuery.refetch()}
        />
      ) : !driversQuery.data?.data.length ? (
        <EmptyState title={t('drivers.empty')} />
      ) : (
        <>
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3">{t('common.name')}</th>
                  <th className="px-4 py-3">{t('drivers.vehicle')}</th>
                  <th className="px-4 py-3">{t('drivers.plate')}</th>
                  <th className="px-4 py-3">{t('drivers.trips')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {driversQuery.data.data.map((driver) => (
                  <tr key={driver.id} className="hover:bg-[var(--bg-muted)]/70">
                    <td className="px-4 py-3 font-semibold">{driver.user.fullName}</td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {[driver.vehicleMake, driver.vehicleModel].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3">{driver.plateNumber ?? '—'}</td>
                    <td className="px-4 py-3">{driver.tripsCount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={driver.status === 'available' ? 'success' : 'default'}>
                        {driver.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              page={driversQuery.data.meta.page}
              limit={driversQuery.data.meta.limit}
              total={driversQuery.data.meta.total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <DialogShell
        open={assignOpen}
        title={t('drivers.assign')}
        onClose={() => setAssignOpen(false)}
      >
        <form onSubmit={handleAssign} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="assignBookingId">{t('payments.bookingId')}</Label>
            <Input id="assignBookingId" name="bookingId" required />
          </div>
          <div>
            <Label htmlFor="assignDriverId">{t('bookings.driver')}</Label>
            <Input id="assignDriverId" name="driverId" required />
          </div>
          <div>
            <Label htmlFor="assignStartDate">{t('drivers.start')}</Label>
            <Input id="assignStartDate" name="startDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="assignEndDate">{t('drivers.end')}</Label>
            <Input id="assignEndDate" name="endDate" type="date" />
          </div>
          {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setAssignOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('drivers.assign')}
            </Button>
          </div>
        </form>
      </DialogShell>
    </PageScaffold>
  );
}
