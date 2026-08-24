import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { vendorKeys, vendorsApi } from '@/modules/fleet/vendors/services/vendors.api';
import { bookingsApi } from '@/modules/clients/bookings/services/bookings.api';
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
  StatusBadge,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import type { VendorType } from '@/shared/api/types';

type Props = {
  type: VendorType;
  titleKey: string;
  descriptionKey: string;
  emptyKey: string;
};

export function CatalogTypePage({ type, titleKey, descriptionKey, emptyKey }: Props) {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [form, setForm] = useState({
    name: '',
    city: '',
    contactName: '',
    phone: '',
    email: '',
  });

  const listQuery = useQuery({
    queryKey: vendorKeys.list({ type, page, search: q }),
    queryFn: ({ signal }) =>
      vendorsApi.list({ type, page, limit: 20, search: q || undefined }, signal),
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'active-mini'],
    queryFn: ({ signal }) => bookingsApi.list({ status: 'active', limit: 100 }, signal),
    enabled: Boolean(assignId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      vendorsApi.create({
        name: form.name.trim(),
        type,
        city: form.city.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('catalog.created') });
      setAddOpen(false);
      setForm({ name: '', city: '', contactName: '', phone: '', email: '' });
      await qc.invalidateQueries({ queryKey: vendorKeys.all });
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
      vendorsApi.assign(assignId!, {
        bookingId,
        serviceDate: serviceDate || undefined,
        appendItinerary: true,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('catalog.assigned') });
      setAssignId(null);
      setBookingId('');
      setServiceDate('');
      await qc.invalidateQueries({ queryKey: vendorKeys.all });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const rows = listQuery.data?.data ?? [];

  return (
    <PageScaffold
      title={t(titleKey)}
      description={t(descriptionKey)}
      primaryAction={
        <Button type="button" onClick={() => setAddOpen(true)}>
          {t('catalog.add')}
        </Button>
      }
      filters={
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={t('catalog.search')}
        />
      }
    >
      {listQuery.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : listQuery.isError ? (
        <ErrorState title={t('catalog.loadFailed')} onRetry={() => void listQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title={t(emptyKey)} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 text-start">{t('common.name')}</th>
                <th className="px-4 py-3 text-start">{t('catalog.city')}</th>
                <th className="px-4 py-3 text-start">{t('catalog.contact')}</th>
                <th className="px-4 py-3 text-start">{t('common.status')}</th>
                <th className="px-4 py-3 text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">{row.city || '—'}</td>
                  <td className="px-4 py-3">
                    <div>{row.contactName || '—'}</div>
                    <div className="text-xs text-[var(--ink-muted)]">{row.phone || row.email || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={row.isActive ? 'success' : 'default'}>
                      {row.isActive ? t('common.active') : t('common.inactive')}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button type="button" variant="secondary" onClick={() => setAssignId(row.id)}>
                      {t('catalog.assign')}
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

      <DialogShell open={addOpen} onClose={() => setAddOpen(false)} title={t('catalog.add')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t('common.name')}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label>{t('catalog.city')}</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div>
            <Label>{t('catalog.contact')}</Label>
            <Input
              value={form.contactName}
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
            />
          </div>
          <div>
            <Label>{t('common.phone')}</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label>{t('common.email')}</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={!form.name.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {t('save')}
          </Button>
        </div>
      </DialogShell>

      <DialogShell
        open={Boolean(assignId)}
        onClose={() => setAssignId(null)}
        title={t('catalog.assign')}
      >
        <div className="space-y-3">
          <div>
            <Label>{t('nav.bookings')}</Label>
            <Select value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
              <option value="">{t('catalog.chooseBooking')}</option>
              {(bookingsQuery.data?.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.znCode} — {b.client?.fullName ?? ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t('catalog.serviceDate')}</Label>
            <Input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setAssignId(null)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={!bookingId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            {t('catalog.assign')}
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}

export function HotelsPage() {
  return (
    <CatalogTypePage
      type="hotel"
      titleKey="catalog.hotels"
      descriptionKey="catalog.hotelsHint"
      emptyKey="catalog.noHotels"
    />
  );
}

export function ActivitiesPage() {
  return (
    <CatalogTypePage
      type="activity"
      titleKey="catalog.activities"
      descriptionKey="catalog.activitiesHint"
      emptyKey="catalog.noActivities"
    />
  );
}

export function ServicesPage() {
  return (
    <CatalogTypePage
      type="service"
      titleKey="catalog.services"
      descriptionKey="catalog.servicesHint"
      emptyKey="catalog.noServices"
    />
  );
}

export function B2bPartnersPage() {
  return (
    <CatalogTypePage
      type="b2b"
      titleKey="catalog.b2b"
      descriptionKey="catalog.b2bHint"
      emptyKey="catalog.noB2b"
    />
  );
}
