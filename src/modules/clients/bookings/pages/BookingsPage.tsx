import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { bookingsApi } from '../services/bookings.api';
import { packagesApi } from '@/modules/finance/packages/services/packages.api';
import {
  Button,
  DialogShell,
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
  Textarea,
  useToast,
  type StatusTone,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { BookingStatus } from '@/shared/api/types';
import { formatDate, formatMoney } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

const STATUS_TONE: Record<BookingStatus, StatusTone> = {
  active: 'success',
  completed: 'default',
  cancelled: 'danger',
};

export function BookingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const bookingsQuery = useQuery({
    queryKey: ['bookings', { page, search: debouncedSearch, status }],
    queryFn: ({ signal }) =>
      bookingsApi.list(
        { page, limit: 20, search: debouncedSearch || undefined, status: status || undefined },
        signal,
      ),
  });

  const packagesQuery = useQuery({
    queryKey: ['packages'],
    queryFn: ({ signal }) => packagesApi.list(signal),
    enabled: createOpen,
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const pageStats = useMemo(() => {
    const rows = bookingsQuery.data?.data ?? [];
    return {
      total: bookingsQuery.data?.meta.total ?? 0,
      active: rows.filter((b) => b.status === 'active').length,
      vip: rows.filter((b) => b.isVip).length,
    };
  }, [bookingsQuery.data]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await bookingsApi.create({
        client: {
          fullName: String(form.get('fullName') || ''),
          phone: String(form.get('phone') || ''),
          email: String(form.get('email') || '') || undefined,
          nationality: String(form.get('nationality') || '') || undefined,
        },
        packageId: String(form.get('packageId') || ''),
        partySize: Number(form.get('partySize') || 1),
        arrivalDate: String(form.get('arrivalDate') || ''),
        departureDate: String(form.get('departureDate') || ''),
        totalAmount: Number(form.get('totalAmount') || 0),
        internalNotes: String(form.get('internalNotes') || '') || undefined,
      });
      push({ tone: 'success', title: t('bookings.createSuccess') });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('bookings.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageScaffold
      title={t('bookings.title')}
      description={t('bookings.description')}
      primaryAction={<Button onClick={() => setCreateOpen(true)}>{t('bookings.newBooking')}</Button>}
      stats={
        bookingsQuery.data ? (
          <>
            <StatsCard label={t('bookings.total')} value={pageStats.total} />
            <StatsCard label={t('common.active')} value={pageStats.active} tone="success" />
            <StatsCard label="VIP" value={pageStats.vip} tone="accent" />
          </>
        ) : undefined
      }
      filters={
        <>
          <SearchBar
            className="max-w-xs"
            placeholder={t('bookings.searchPlaceholder')}
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <Select
            className="max-w-xs"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as BookingStatus | '');
              setPage(1);
            }}
          >
            <option value="">{t('bookings.allStatuses')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="completed">{t('common.completed')}</option>
            <option value="cancelled">{t('common.cancelled')}</option>
          </Select>
        </>
      }
    >
      {bookingsQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : bookingsQuery.isError ? (
        <ErrorState
          description={t('bookings.loadFailed')}
          onRetry={() => bookingsQuery.refetch()}
        />
      ) : !bookingsQuery.data?.data.length ? (
        <EmptyState title={t('bookings.empty')} description={t('bookings.emptyHint')} />
      ) : (
        <>
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3">{t('payments.zn')}</th>
                  <th className="px-4 py-3">{t('common.client')}</th>
                  <th className="px-4 py-3">{t('common.date')}</th>
                  <th className="px-4 py-3">{t('bookings.total')}</th>
                  <th className="px-4 py-3">{t('bookings.due')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {bookingsQuery.data.data.map((booking) => (
                  <tr
                    key={booking.id}
                    className="cursor-pointer hover:bg-[var(--bg-muted)]/70"
                    onClick={() => navigate(`/bookings/${booking.id}`)}
                  >
                    <td className="px-4 py-3 font-semibold">{booking.znCode}</td>
                    <td className="px-4 py-3">
                      {booking.client?.fullName}
                      {booking.isVip ? <StatusBadge tone="accent"> VIP</StatusBadge> : null}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {formatDate(booking.arrivalDate)} – {formatDate(booking.departureDate)}
                    </td>
                    <td className="px-4 py-3">{formatMoney(booking.totalAmount)}</td>
                    <td className="px-4 py-3">{formatMoney(booking.dueAmount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={STATUS_TONE[booking.status]}>{booking.status}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              page={bookingsQuery.data.meta.page}
              limit={bookingsQuery.data.meta.limit}
              total={bookingsQuery.data.meta.total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <DialogShell
        open={createOpen}
        title={t('bookings.newBooking')}
        onClose={() => setCreateOpen(false)}
        wide
      >
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fullName">{t('bookings.clientName')}</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div>
            <Label htmlFor="phone">{t('common.phone')}</Label>
            <Input id="phone" name="phone" required />
          </div>
          <div>
            <Label htmlFor="email">{t('common.email')}</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div>
            <Label htmlFor="nationality">{t('bookings.nationality')}</Label>
            <Input id="nationality" name="nationality" />
          </div>
          <div>
            <Label htmlFor="packageId">{t('bookings.package')}</Label>
            <Select id="packageId" name="packageId" required defaultValue="">
              <option value="" disabled>
                {packagesQuery.isLoading ? t('loading') : t('bookings.selectPackage')}
              </option>
              {packagesQuery.data?.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="partySize">{t('bookings.partySize')}</Label>
            <Input id="partySize" name="partySize" type="number" min={1} defaultValue={1} required />
          </div>
          <div>
            <Label htmlFor="arrivalDate">{t('bookings.arrival')}</Label>
            <Input id="arrivalDate" name="arrivalDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="departureDate">{t('bookings.departure')}</Label>
            <Input id="departureDate" name="departureDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="totalAmount">{t('bookings.totalAmount')}</Label>
            <Input id="totalAmount" name="totalAmount" type="number" min={0} step="0.01" required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="internalNotes">{t('bookings.notes')}</Label>
            <Textarea id="internalNotes" name="internalNotes" rows={3} />
          </div>
          {formError ? (
            <p className="sm:col-span-2 text-sm text-[var(--danger)]">{formError}</p>
          ) : null}
          <div className="sm:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('bookings.createBooking')}
            </Button>
          </div>
        </form>
      </DialogShell>
    </PageScaffold>
  );
}
