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
import type { Vendor } from '@/shared/api/types';

type FormState = {
  name: string;
  city: string;
  contactName: string;
  phone: string;
  email: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  city: '',
  contactName: '',
  phone: '',
  email: '',
  isActive: true,
});

function formFromVendor(row: Vendor): FormState {
  return {
    name: row.name ?? '',
    city: row.city ?? '',
    contactName: row.contactName ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    isActive: row.isActive !== false,
  };
}

export function GuidesPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<Vendor | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm());

  const listQuery = useQuery({
    queryKey: vendorKeys.list({ type: 'guide', page, search: q }),
    queryFn: ({ signal }) =>
      vendorsApi.list({ type: 'guide', page, limit: 20, search: q || undefined }, signal),
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
        type: 'guide',
        city: form.city.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('guides.created') });
      setAddOpen(false);
      setForm(emptyForm());
      await qc.invalidateQueries({ queryKey: vendorKeys.all });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      vendorsApi.update(editRow!.id, {
        name: form.name.trim(),
        type: 'guide',
        city: form.city.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        isActive: form.isActive,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('guides.updated') });
      setEditRow(null);
      setForm(emptyForm());
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
      push({ tone: 'success', title: t('guides.assigned') });
      setAssignId(null);
      setBookingId('');
      await qc.invalidateQueries({ queryKey: vendorKeys.all });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const guides = listQuery.data?.data ?? [];
  const formBusy = createMutation.isPending || updateMutation.isPending;

  function renderFormFields(showStatus: boolean) {
    return (
      <div className="space-y-3">
        <div>
          <Label>{t('common.name')}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>{t('guides.city')}</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <Label>{t('guides.contact')}</Label>
          <Input
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          />
        </div>
        <div>
          <Label>{t('common.phone')}</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label>{t('common.email')}</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        {showStatus ? (
          <div>
            <Label>{t('common.status')}</Label>
            <Select
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.value === 'active' }))
              }
            >
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </Select>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <PageScaffold
      title={t('guides.title')}
      description={t('guides.description')}
      primaryAction={
        <Button
          type="button"
          onClick={() => {
            setForm(emptyForm());
            setAddOpen(true);
          }}
        >
          {t('guides.add')}
        </Button>
      }
    >
      <SearchBar
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder={t('guides.searchPlaceholder')}
        className="mb-4 max-w-sm"
      />
      {listQuery.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : listQuery.isError ? (
        <ErrorState title={t('guides.loadFailed')} onRetry={() => void listQuery.refetch()} />
      ) : guides.length === 0 ? (
        <EmptyState title={t('guides.empty')} description={t('guides.emptyHint')} />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {guides.map((g: Vendor) => (
              <article
                key={g.id}
                className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{g.name}</h3>
                  <StatusBadge tone={g.isActive ? 'success' : 'default'}>
                    {g.isActive ? t('common.active') : t('common.inactive')}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  {[g.city, g.contactName, g.phone].filter(Boolean).join(' · ') || '—'}
                </p>
                {g.email ? (
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">{g.email}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditRow(g);
                      setForm(formFromVendor(g));
                    }}
                  >
                    {t('edit')}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setAssignId(g.id)}>
                    {t('guides.assign')}
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4">
            <Pagination
              page={listQuery.data?.meta.page ?? page}
              limit={listQuery.data?.meta.limit ?? 20}
              total={listQuery.data?.meta.total ?? 0}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <DialogShell
        open={addOpen}
        title={t('guides.add')}
        onClose={() => {
          if (formBusy) return;
          setAddOpen(false);
        }}
      >
        {renderFormFields(false)}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={!form.name.trim()}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {t('save')}
          </Button>
        </div>
      </DialogShell>

      <DialogShell
        open={Boolean(editRow)}
        title={t('guides.edit')}
        onClose={() => {
          if (formBusy) return;
          setEditRow(null);
        }}
      >
        {renderFormFields(true)}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditRow(null)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={!form.name.trim()}
            loading={updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            {t('save')}
          </Button>
        </div>
      </DialogShell>

      <DialogShell
        open={Boolean(assignId)}
        title={t('guides.assign')}
        onClose={() => setAssignId(null)}
      >
        <div className="space-y-3">
          <div>
            <Label>{t('emailSystem.booking')}</Label>
            <Select value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
              <option value="">{t('emailSystem.chooseBooking')}</option>
              {(bookingsQuery.data?.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.znCode} — {b.client?.fullName ?? ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t('guides.serviceDate')}</Label>
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
            disabled={!bookingId}
            loading={assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            {t('guides.assign')}
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
