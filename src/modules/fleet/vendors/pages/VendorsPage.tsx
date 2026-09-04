import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, User } from 'lucide-react';
import { vendorKeys, vendorsApi } from '../services/vendors.api';
import { bookingsApi } from '@/modules/clients/bookings/services/bookings.api';
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
  StatusBadge,
  Textarea,
  useToast,
  type StatusTone,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type {
  Vendor,
  VendorBookingRow,
  VendorDetail,
  VendorType,
  VendorVoucher,
} from '@/shared/api/types';

const TYPES: VendorType[] = [
  'hotel',
  'restaurant',
  'guide',
  'bus',
  'activity',
  'driver',
  'service',
  'b2b',
];

const TYPE_EMOJI: Record<VendorType, string> = {
  hotel: '🏨',
  restaurant: '🍽️',
  guide: '🗺️',
  bus: '🚌',
  activity: '🎭',
  driver: '🚗',
  service: '🛠️',
  b2b: '🤝',
};

const TYPE_LABEL: Record<VendorType, string> = {
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  guide: 'Guide',
  bus: 'Bus',
  activity: 'Activity',
  driver: 'Driver',
  service: 'Service',
  b2b: 'B2B Partner',
};

function bookingTone(status: string): StatusTone {
  if (status === 'confirmed' || status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'warning';
}

function paymentLabel(value: string | null | undefined, t: (k: string) => string) {
  if (value === 'bank_transfer') return t('vendors.bankTransfer');
  if (value === 'cash') return t('vendors.cash');
  if (value === 'voucher') return t('vendors.voucherPay');
  return value || '—';
}

type AddForm = {
  name: string;
  type: VendorType;
  city: string;
  contactName: string;
  phone: string;
  email: string;
  commissionPct: string;
  paymentTerms: string;
  cancellationPolicy: string;
  notes: string;
};

const emptyAdd = (): AddForm => ({
  name: '',
  type: 'hotel',
  city: '',
  contactName: '',
  phone: '',
  email: '',
  commissionPct: '10',
  paymentTerms: 'bank_transfer',
  cancellationPolicy: '',
  notes: '',
});

export function VendorsPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [type, setType] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyAdd());
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [editForm, setEditForm] = useState<AddForm & { isActive: boolean }>({
    ...emptyAdd(),
    isActive: true,
  });
  const [assignVendor, setAssignVendor] = useState<Vendor | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({
    bookingId: '',
    serviceDate: '',
    pax: '1',
    details: '',
    amount: '',
  });
  const [voucher, setVoucher] = useState<VendorVoucher | null>(null);

  const listQuery = useQuery({
    queryKey: vendorKeys.list({ type, limit: 100 }),
    queryFn: ({ signal }) =>
      vendorsApi.list(
        {
          page: 1,
          limit: 100,
          type: type || undefined,
        },
        signal,
      ),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const statsQuery = useQuery({
    queryKey: vendorKeys.stats(),
    queryFn: ({ signal }) => vendorsApi.stats(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'active-codes'],
    queryFn: ({ signal }) =>
      bookingsApi.list({ status: 'active', limit: 100 }, signal),
    staleTime: 20_000,
    enabled: Boolean(assignVendor),
    refetchOnWindowFocus: false,
  });

  const detailQuery = useQuery({
    queryKey: vendorKeys.detail(detailId ?? ''),
    queryFn: ({ signal }) => vendorsApi.get(detailId!, signal),
    enabled: Boolean(detailId),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const vendors = useMemo(() => {
    const rows = listQuery.data?.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((v) =>
      `${v.name} ${v.city ?? ''} ${v.contactName ?? ''} ${v.email ?? ''} ${v.phone ?? ''}`
        .toLowerCase()
        .includes(needle),
    );
  }, [listQuery.data, q]);
  const stats = statsQuery.data;
  const activeBookings = bookingsQuery.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      vendorsApi.create({
        name: addForm.name.trim(),
        type: addForm.type,
        city: addForm.city.trim() || undefined,
        contactName: addForm.contactName.trim() || undefined,
        phone: addForm.phone.trim() || undefined,
        email: addForm.email.trim() || undefined,
        commissionPct: Number(addForm.commissionPct) || 0,
        paymentTerms: addForm.paymentTerms || undefined,
        cancellationPolicy: addForm.cancellationPolicy.trim() || undefined,
        notes: addForm.notes.trim() || undefined,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('vendors.created') });
      setAddOpen(false);
      setAddForm(emptyAdd());
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
      vendorsApi.update(editVendor!.id, {
        name: editForm.name.trim(),
        type: editForm.type,
        city: editForm.city.trim() || undefined,
        contactName: editForm.contactName.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        email: editForm.email.trim() || undefined,
        commissionPct: Number(editForm.commissionPct) || 0,
        paymentTerms: editForm.paymentTerms || undefined,
        cancellationPolicy: editForm.cancellationPolicy.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
        isActive: editForm.isActive,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('vendors.updated') });
      const id = editVendor!.id;
      setEditVendor(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: vendorKeys.all }),
        qc.invalidateQueries({ queryKey: vendorKeys.detail(id) }),
      ]);
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => vendorsApi.remove(editVendor!.id),
    onSuccess: async () => {
      push({ tone: 'success', title: t('vendors.removed') });
      setEditVendor(null);
      setDetailId(null);
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
      vendorsApi.assign(assignVendor!.id, {
        bookingId: assignForm.bookingId,
        serviceDate: assignForm.serviceDate || undefined,
        pax: assignForm.pax ? Number(assignForm.pax) : undefined,
        details: assignForm.details.trim() || undefined,
        amount: assignForm.amount ? Number(assignForm.amount) : undefined,
        appendItinerary: true,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('vendors.assigned') });
      setAssignVendor(null);
      setAssignForm({ bookingId: '', serviceDate: '', pax: '1', details: '', amount: '' });
      await Promise.all([
        qc.invalidateQueries({ queryKey: vendorKeys.all }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
      ]);
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('vendors.assignFailed'),
      });
    },
  });

  const voucherMutation = useMutation({
    mutationFn: (vendorBookingId: string) =>
      vendorsApi.voucher(detailId!, vendorBookingId),
    onSuccess: async (data) => {
      setVoucher(data);
      push({ tone: 'success', title: t('vendors.voucherReady') });
      await qc.invalidateQueries({ queryKey: vendorKeys.detail(detailId!) });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('vendors.voucherFailed'),
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => vendorsApi.updateBooking(detailId!, id, { status }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('vendors.statusUpdated') });
      await qc.invalidateQueries({ queryKey: vendorKeys.all });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const pills = useMemo(
    () => [
      { id: '', label: `🏢 ${t('vendors.all')}`, count: stats?.total },
      { id: 'hotel', label: `🏨 ${t('vendors.hotel')}`, count: stats?.hotel },
      { id: 'restaurant', label: `🍽️ ${t('vendors.restaurant')}`, count: stats?.restaurant },
      { id: 'guide', label: `🗺️ ${t('vendors.guide')}`, count: stats?.guide },
      { id: 'bus', label: `🚌 ${t('vendors.bus')}`, count: stats?.bus },
      { id: 'activity', label: `🎭 ${t('vendors.activity')}`, count: stats?.activity },
      { id: 'driver', label: `🚗 ${t('vendors.driver')}`, count: stats?.driver },
    ],
    [stats, t],
  );

  function submitAdd(e: FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    createMutation.mutate();
  }

  function openEdit(vendor: Vendor) {
    setEditVendor(vendor);
    setEditForm({
      name: vendor.name ?? '',
      type: (vendor.type as VendorType) || 'hotel',
      city: vendor.city ?? '',
      contactName: vendor.contactName ?? '',
      phone: vendor.phone ?? '',
      email: vendor.email ?? '',
      commissionPct: String(vendor.commissionPct ?? 0),
      paymentTerms: vendor.paymentTerms ?? 'bank_transfer',
      cancellationPolicy: vendor.cancellationPolicy ?? '',
      notes: vendor.notes ?? '',
      isActive: vendor.isActive !== false,
    });
  }

  function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editForm.name.trim() || !editVendor) return;
    updateMutation.mutate();
  }

  return (
    <PageScaffold
      title={t('vendors.title')}
      description={t('vendors.description')}
      primaryAction={
        <Button type="button" onClick={() => setAddOpen(true)}>
          + {t('vendors.add')}
        </Button>
      }
      filters={
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {pills.map((pill) => (
              <button
                key={pill.id || 'all'}
                type="button"
                onClick={() => setType(pill.id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  type === pill.id
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]'
                }`}
              >
                {pill.label}
                {pill.count != null ? ` (${pill.count})` : ''}
              </button>
            ))}
          </div>
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder={t('vendors.searchPlaceholder')}
            className="max-w-sm"
          />
        </div>
      }
    >
      {listQuery.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : listQuery.isError ? (
        <ErrorState
          title={t('vendors.loadFailed')}
          description={
            listQuery.error instanceof ApiClientError ? listQuery.error.message : undefined
          }
          onRetry={() => void listQuery.refetch()}
        />
      ) : vendors.length === 0 ? (
        <EmptyState
          title={t('vendors.empty')}
          description={t('vendors.emptyHint')}
          action={
            <Button type="button" onClick={() => setAddOpen(true)}>
              {t('vendors.addOne')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onEdit={() => openEdit(vendor)}
              onAssign={() => {
                setAssignVendor(vendor);
                setAssignForm({
                  bookingId: '',
                  serviceDate: '',
                  pax: '1',
                  details: '',
                  amount: '',
                });
              }}
              onDetails={() => {
                setDetailId(vendor.id);
                setVoucher(null);
              }}
            />
          ))}
        </div>
      )}

      <DialogShell
        open={addOpen}
        title={t('vendors.add')}
        onClose={() => {
          if (createMutation.isPending) return;
          setAddOpen(false);
        }}
        wide
      >
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitAdd}>
          <div className="sm:col-span-2">
            <Label htmlFor="v-name">{t('vendors.name')}</Label>
            <Input
              id="v-name"
              required
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ritz-Carlton Moscow"
            />
          </div>
          <div>
            <Label htmlFor="v-type">{t('vendors.type')}</Label>
            <Select
              id="v-type"
              value={addForm.type}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, type: e.target.value as VendorType }))
              }
            >
              {TYPES.map((item) => (
                <option key={item} value={item}>
                  {TYPE_EMOJI[item]} {TYPE_LABEL[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="v-city">{t('vendors.city')}</Label>
            <Input
              id="v-city"
              value={addForm.city}
              onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Moscow"
            />
          </div>
          <div>
            <Label htmlFor="v-contact">{t('vendors.contactPerson')}</Label>
            <Input
              id="v-contact"
              value={addForm.contactName}
              onChange={(e) => setAddForm((f) => ({ ...f, contactName: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="v-phone">{t('vendors.phone')}</Label>
            <Input
              id="v-phone"
              value={addForm.phone}
              onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+74950000000"
            />
          </div>
          <div>
            <Label htmlFor="v-email">{t('vendors.email')}</Label>
            <Input
              id="v-email"
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="v-comm">{t('vendors.commissionPct')}</Label>
            <Input
              id="v-comm"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={addForm.commissionPct}
              onChange={(e) => setAddForm((f) => ({ ...f, commissionPct: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="v-pay">{t('vendors.paymentTerms')}</Label>
            <Select
              id="v-pay"
              value={addForm.paymentTerms}
              onChange={(e) => setAddForm((f) => ({ ...f, paymentTerms: e.target.value }))}
            >
              <option value="bank_transfer">{t('vendors.bankTransfer')}</option>
              <option value="cash">{t('vendors.cash')}</option>
              <option value="voucher">{t('vendors.voucherPay')}</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="v-cancel">{t('vendors.cancellation')}</Label>
            <Input
              id="v-cancel"
              value={addForm.cancellationPolicy}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, cancellationPolicy: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="v-notes">{t('vendors.notes')}</Label>
            <Textarea
              id="v-notes"
              rows={3}
              value={addForm.notes}
              onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
          <Button
            type="button"
              variant="secondary"
              onClick={() => setAddOpen(false)}
              disabled={createMutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" loading={createMutation.isPending} disabled={!addForm.name.trim()}>
              {t('save')}
            </Button>
          </div>
        </form>
      </DialogShell>

      <DialogShell
        open={Boolean(editVendor)}
        title={t('vendors.edit')}
        onClose={() => {
          if (updateMutation.isPending) return;
          setEditVendor(null);
        }}
        wide
      >
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitEdit}>
          <div className="sm:col-span-2">
            <Label htmlFor="ev-name">{t('vendors.name')}</Label>
            <Input
              id="ev-name"
              required
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="ev-type">{t('vendors.type')}</Label>
            <Select
              id="ev-type"
              value={editForm.type}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, type: e.target.value as VendorType }))
              }
            >
              {TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {TYPE_EMOJI[tp]} {TYPE_LABEL[tp]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ev-status">{t('common.status')}</Label>
            <Select
              id="ev-status"
              value={editForm.isActive ? 'active' : 'inactive'}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, isActive: e.target.value === 'active' }))
              }
            >
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ev-city">{t('vendors.city')}</Label>
            <Input
              id="ev-city"
              value={editForm.city}
              onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="ev-contact">{t('vendors.contactPerson')}</Label>
            <Input
              id="ev-contact"
              value={editForm.contactName}
              onChange={(e) => setEditForm((f) => ({ ...f, contactName: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="ev-phone">{t('vendors.phone')}</Label>
            <Input
              id="ev-phone"
              value={editForm.phone}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="ev-email">{t('vendors.email')}</Label>
            <Input
              id="ev-email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="ev-comm">{t('vendors.commissionPct')}</Label>
            <Input
              id="ev-comm"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={editForm.commissionPct}
              onChange={(e) => setEditForm((f) => ({ ...f, commissionPct: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="ev-pay">{t('vendors.paymentTerms')}</Label>
            <Select
              id="ev-pay"
              value={editForm.paymentTerms}
              onChange={(e) => setEditForm((f) => ({ ...f, paymentTerms: e.target.value }))}
            >
              <option value="bank_transfer">{t('vendors.bankTransfer')}</option>
              <option value="cash">{t('vendors.cash')}</option>
              <option value="voucher">{t('vendors.voucherPay')}</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="ev-cancel">{t('vendors.cancellation')}</Label>
            <Input
              id="ev-cancel"
              value={editForm.cancellationPolicy}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, cancellationPolicy: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="ev-notes">{t('vendors.notes')}</Label>
            <Textarea
              id="ev-notes"
              rows={3}
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="danger"
              disabled={updateMutation.isPending || removeMutation.isPending}
              loading={removeMutation.isPending}
              onClick={() => {
                if (!editVendor) return;
                if (!window.confirm(t('vendors.confirmRemove'))) return;
                removeMutation.mutate();
              }}
            >
              {t('vendors.remove')}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditVendor(null)}
                disabled={updateMutation.isPending || removeMutation.isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                loading={updateMutation.isPending}
                disabled={!editForm.name.trim() || removeMutation.isPending}
              >
                {t('save')}
              </Button>
            </div>
          </div>
        </form>
      </DialogShell>

      <DialogShell
        open={Boolean(assignVendor)}
        title={t('vendors.assignTitle')}
        onClose={() => {
          if (assignMutation.isPending) return;
          setAssignVendor(null);
        }}
      >
        {assignVendor ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--ink-muted)]">{t('vendors.assignHint')}</p>
            <p className="font-semibold">{assignVendor.name}</p>
            <div>
              <Label htmlFor="a-client">{t('vendors.selectClient')}</Label>
              <Select
                id="a-client"
                value={assignForm.bookingId}
                onChange={(e) => {
                  const booking = activeBookings.find((b) => b.id === e.target.value);
                  setAssignForm((f) => ({
                    ...f,
                    bookingId: e.target.value,
                    serviceDate: f.serviceDate || booking?.arrivalDate || '',
                    pax: booking ? String(booking.partySize) : f.pax,
                  }));
                }}
              >
                <option value="">{t('vendors.selectClient')}</option>
                {activeBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.znCode} — {b.client?.fullName ?? t('vendors.contact')}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="a-date">{t('vendors.serviceDate')}</Label>
              <Input
                id="a-date"
                type="date"
                value={assignForm.serviceDate}
                onChange={(e) => setAssignForm((f) => ({ ...f, serviceDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="a-pax">{t('vendors.pax')}</Label>
              <Input
                id="a-pax"
                type="number"
                min={1}
                value={assignForm.pax}
                onChange={(e) => setAssignForm((f) => ({ ...f, pax: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="a-details">{t('vendors.detailsField')}</Label>
              <Textarea
                id="a-details"
                rows={2}
                value={assignForm.details}
                onChange={(e) => setAssignForm((f) => ({ ...f, details: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="a-amount">{t('vendors.amount')}</Label>
              <Input
                id="a-amount"
                type="number"
                min={0}
                step="0.01"
                value={assignForm.amount}
                onChange={(e) => setAssignForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAssignVendor(null)}
                disabled={assignMutation.isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                disabled={!assignForm.bookingId || assignMutation.isPending}
                loading={assignMutation.isPending}
                onClick={() => assignMutation.mutate()}
              >
                {t('vendors.confirmAssign')}
          </Button>
        </div>
          </div>
        ) : null}
      </DialogShell>

      <DialogShell
        open={Boolean(detailId)}
        title={t('vendors.detailsTitle')}
        onClose={() => {
          setDetailId(null);
          setVoucher(null);
        }}
        wide
      >
        {detailQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : detailQuery.isError || !detailQuery.data ? (
          <ErrorState
            title={t('vendors.loadFailed')}
            onRetry={() => void detailQuery.refetch()}
          />
        ) : (
          <VendorDetails
            vendor={detailQuery.data}
            voucher={voucher}
            voucherPending={voucherMutation.isPending}
            statusPending={statusMutation.isPending}
            onEdit={() => {
              openEdit(detailQuery.data!);
              setDetailId(null);
            }}
            onVoucher={(id) => voucherMutation.mutate(id)}
            onStatus={(id, status) => statusMutation.mutate({ id, status })}
            onCopy={async (text) => {
              await navigator.clipboard.writeText(text);
              push({ tone: 'success', title: t('vendors.copied') });
            }}
          />
        )}
      </DialogShell>
    </PageScaffold>
  );
}

function VendorCard({
  vendor,
  onEdit,
  onAssign,
  onDetails,
}: {
  vendor: Vendor;
  onEdit: () => void;
  onAssign: () => void;
  onDetails: () => void;
}) {
  const { t } = useTranslation();
  const type = (vendor.type as VendorType) || 'hotel';
  const pct = Number(vendor.commissionPct ?? 0).toFixed(2);

  return (
    <article className="flex flex-col rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{vendor.name}</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            {TYPE_LABEL[type] ?? vendor.type}
            {vendor.city ? ` · ${vendor.city}` : ''}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
          {pct}%
        </span>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        {vendor.contactName ? (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-[var(--ink-muted)]" aria-hidden />
            <span>{vendor.contactName}</span>
          </div>
        ) : null}
        {vendor.phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-[var(--ink-muted)]" aria-hidden />
            <a className="text-[var(--accent)]" href={`tel:${vendor.phone}`}>
              {vendor.phone}
            </a>
          </div>
        ) : null}
        {vendor.email ? (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-[var(--ink-muted)]" aria-hidden />
            <a className="truncate text-[var(--accent)]" href={`mailto:${vendor.email}`}>
              {vendor.email}
            </a>
          </div>
        ) : null}
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={onEdit}>
            {t('edit')}
          </Button>
          <Button type="button" variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={onAssign}>
            + {t('vendors.assign')}
          </Button>
        </div>
        <button
          type="button"
          className="text-sm font-medium text-[var(--accent)] hover:underline"
          onClick={onDetails}
        >
          {t('vendors.viewDetails')} →
        </button>
      </div>
    </article>
  );
}

function VendorDetails({
  vendor,
  voucher,
  voucherPending,
  statusPending,
  onEdit,
  onVoucher,
  onStatus,
  onCopy,
}: {
  vendor: VendorDetail;
  voucher: VendorVoucher | null;
  voucherPending: boolean;
  statusPending: boolean;
  onEdit: () => void;
  onVoucher: (id: string) => void;
  onStatus: (id: string, status: string) => void;
  onCopy: (text: string) => void;
}) {
  const { t } = useTranslation();
  const type = (vendor.type as VendorType) || 'hotel';
  const bookings = vendor.bookings ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{vendor.name}</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            {TYPE_EMOJI[type]} {TYPE_LABEL[type] ?? vendor.type}
            {vendor.city ? ` · ${vendor.city}` : ''}
            {' · '}
            {Number(vendor.commissionPct ?? 0).toFixed(2)}%
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onEdit}>
          {t('edit')}
        </Button>
      </div>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          {t('vendors.contractTerms')}
        </h4>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--ink-muted)]">{t('vendors.paymentTerms')}</dt>
            <dd>{paymentLabel(vendor.paymentTerms, t)}</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">{t('vendors.commission')}</dt>
            <dd>{Number(vendor.commissionPct ?? 0).toFixed(2)}%</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[var(--ink-muted)]">{t('vendors.cancellation')}</dt>
            <dd>{vendor.cancellationPolicy || '—'}</dd>
          </div>
          {vendor.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-[var(--ink-muted)]">{t('vendors.notes')}</dt>
              <dd>{vendor.notes}</dd>
            </div>
          ) : null}
        </dl>
        {vendor.finance ? (
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            {t('vendors.finance')}: {vendor.finance.totalBookings} · $
            {vendor.finance.totalAmount.toFixed(0)} · {t('vendors.commission')} $
            {vendor.finance.totalCommission.toFixed(0)}
          </p>
        ) : null}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          {t('vendors.bookingsLog')}
        </h4>
        {bookings.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{t('vendors.noBookings')}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {bookings.map((row: VendorBookingRow) => (
              <li
                key={row.id}
                className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {row.znCode} · {row.clientName}
                  </p>
                  <StatusBadge tone={bookingTone(row.status)}>{row.status}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {row.serviceDate ?? '—'}
                  {row.pax != null ? ` · ${row.pax} pax` : ''}
                  {row.details ? ` · ${row.details}` : ''}
                  {row.voucherCode ? ` · ${row.voucherCode}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    loading={voucherPending}
                    onClick={() => onVoucher(row.id)}
                  >
                    {t('vendors.generateVoucher')}
                  </Button>
                  {row.status === 'pending' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-3 !py-1.5 text-xs"
                      disabled={statusPending}
                      onClick={() => onStatus(row.id, 'confirmed')}
                    >
                      Confirm
                    </Button>
                  ) : null}
                  {row.status === 'confirmed' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-3 !py-1.5 text-xs"
                      disabled={statusPending}
                      onClick={() => onStatus(row.id, 'completed')}
                    >
                      Complete
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {voucher ? (
        <section className="rounded-xl bg-[var(--bg-muted)] p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            {t('vendors.emailDraft')}
          </h4>
          <p className="mt-1 font-mono text-sm font-bold">{voucher.voucherCode}</p>
          <p className="mt-1 text-sm">
            <span className="text-[var(--ink-muted)]">To · </span>
            {voucher.email.to || '—'}
          </p>
          <p className="text-sm font-medium">{voucher.email.subject}</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{voucher.email.body}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="!px-3 !py-1.5 text-xs"
              onClick={() =>
                onCopy(
                  `To: ${voucher.email.to ?? ''}\nSubject: ${voucher.email.subject}\n\n${voucher.email.body}`,
                )
              }
            >
              Copy
            </Button>
            <Link
              to="/email"
              className="inline-flex items-center rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--bg-elevated)]"
            >
              {t('vendors.openEmail')}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
