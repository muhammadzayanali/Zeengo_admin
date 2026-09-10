import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { bookingsApi } from '../services/bookings.api';
import { operationsApi } from '@/modules/command/operations/services/operations.api';
import { itinerariesApi } from '@/modules/command/itineraries/services/itineraries.api';
import { editRequestsApi } from '@/modules/clients/edit-requests/services/edit-requests.api';
import { sosApi } from '@/modules/command/sos/services/sos.api';
import { paymentsApi, type CashMethod } from '@/modules/finance/payments/services/payments.api';
import { usersApi } from '@/modules/admin/users/services/users.api';
import { AssignDriverPanel } from '@/modules/clients/components/AssignDriverPanel';
import { NewTaskPanel } from '@/modules/clients/components/NewTaskPanel';
import { ClientEditForm } from '@/modules/clients/components/ClientEditForm';
import { BookingAttachVendorDialog } from '../components/BookingAttachVendorDialog';
import { BookingChatPanel } from '../components/BookingChatPanel';
import { vendorsApi } from '@/modules/fleet/vendors/services/vendors.api';
import {
  Badge,
  Button,
  Card,
  DialogShell,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Select,
  Skeleton,
  TabBar,
  Textarea,
  useToast,
} from '@/shared/ui';
import { formatDate, formatMoney } from '@/shared/lib/cn';
import { ApiClientError } from '@/shared/api/client';
import type { ItineraryItem } from '@/shared/api/types';

type TabId =
  | 'overview'
  | 'client'
  | 'program'
  | 'hotels'
  | 'activities'
  | 'services'
  | 'b2b'
  | 'suppliers'
  | 'driver'
  | 'guide'
  | 'tasks'
  | 'payments'
  | 'chat'
  | 'edit-requests'
  | 'sos'
  | 'documents'
  | 'history';

type AttachKind = 'hotel' | 'activity' | 'service' | 'b2b' | 'vendor' | null;
type Panel = 'driver' | 'task' | 'edit' | 'payment' | 'guide' | null;

const ATTACH_META: Record<
  Exclude<AttachKind, null>,
  { type: string; title: string }
> = {
  hotel: { type: 'hotel', title: 'Attach Hotel' },
  activity: { type: 'activity', title: 'Attach Activity / Event' },
  service: { type: 'service', title: 'Attach Service' },
  b2b: { type: 'b2b', title: 'Attach B2B Partner' },
  vendor: { type: '', title: 'Attach Supplier / Vendor' },
};

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function VendorList({
  rows,
  empty,
}: {
  rows: Array<{
    id: string;
    vendorName: string;
    vendorType: string;
    vendorCity: string | null;
    serviceDate: string | null;
    status: string;
    details: string | null;
    amount: number | null;
    voucherCode: string | null;
  }>;
  empty: string;
}) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--line)] pb-2 text-sm last:border-0"
        >
          <div>
            <p className="font-semibold">{row.vendorName}</p>
            <p className="text-[var(--ink-muted)]">
              {row.vendorType}
              {row.vendorCity ? ` · ${row.vendorCity}` : ''}
              {row.serviceDate ? ` · ${formatDate(row.serviceDate)}` : ''}
            </p>
            {row.details ? <p className="mt-1">{row.details}</p> : null}
            {row.voucherCode ? (
              <p className="text-xs text-[var(--ink-muted)]">Voucher {row.voucherCode}</p>
            ) : null}
          </div>
          <div className="text-right">
            <Badge>{row.status}</Badge>
            {row.amount != null ? (
              <p className="mt-1 font-semibold">{formatMoney(row.amount)}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function VendorAttachInline({
  bookingId,
  vendorType,
  onDone,
  onCancel,
}: {
  bookingId: string;
  vendorType: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { push } = useToast();
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [details, setDetails] = useState('');

  const vendors = useQuery({
    queryKey: ['vendors', 'attach-inline', vendorType],
    queryFn: ({ signal }) =>
      vendorsApi.list({ type: vendorType, isActive: true, limit: 100 }, signal),
  });

  const assign = useMutation({
    mutationFn: () =>
      vendorsApi.assign(vendorId, {
        bookingId,
        serviceDate: serviceDate || undefined,
        details: details.trim() || undefined,
        appendItinerary: true,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: 'Supplier attached' });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['bookings', bookingId] }),
        qc.invalidateQueries({ queryKey: ['operations', 'booking', bookingId] }),
        qc.invalidateQueries({ queryKey: ['vendors'] }),
      ]);
      onDone();
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : 'Could not attach',
      }),
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Select from catalog</Label>
        <Select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="mt-1 w-full"
        >
          <option value="">Choose…</option>
          {(vendors.data?.data ?? []).map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.city ? ` · ${v.city}` : ''}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Service date</Label>
        <Input
          type="date"
          className="mt-1"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
        />
      </div>
      <div>
        <Label>Details</Label>
        <Input
          className="mt-1"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!vendorId}
          loading={assign.isPending}
          onClick={() => assign.mutate()}
        >
          Attach
        </Button>
      </div>
    </div>
  );
}

export function BookingDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { push } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('overview');
  const [panel, setPanel] = useState<Panel>(null);
  const [attach, setAttach] = useState<AttachKind>(null);
  const [attachVendorType, setAttachVendorType] = useState('hotel');

  const [itemTitle, setItemTitle] = useState('');
  const [itemDay, setItemDay] = useState(1);
  const [itemDate, setItemDate] = useState('');
  const [itemTime, setItemTime] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);

  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<CashMethod>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [guideStaffId, setGuideStaffId] = useState('');

  const booking = useQuery({
    queryKey: ['bookings', id],
    queryFn: ({ signal }) => bookingsApi.get(id, signal),
    enabled: Boolean(id),
  });

  const ops = useQuery({
    queryKey: ['operations', 'booking', id],
    queryFn: ({ signal }) => operationsApi.booking(id, signal),
    enabled: Boolean(id),
  });

  const itinerary = useQuery({
    queryKey: ['bookings', id, 'itinerary'],
    queryFn: ({ signal }) => itinerariesApi.forBooking(id, signal),
    enabled: Boolean(id) && (tab === 'program' || tab === 'overview'),
  });

  const staffUsers = useQuery({
    queryKey: ['users', 'guide-assign'],
    queryFn: ({ signal }) => usersApi.list(undefined, signal),
    enabled: panel === 'guide' || tab === 'guide',
  });

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['bookings', id] }),
      qc.invalidateQueries({ queryKey: ['operations', 'booking', id] }),
      qc.invalidateQueries({ queryKey: ['bookings', id, 'itinerary'] }),
      qc.invalidateQueries({ queryKey: ['bookings'] }),
      qc.invalidateQueries({ queryKey: ['operations'] }),
    ]);
  };

  const addItem = useMutation({
    mutationFn: () =>
      itinerariesApi.addItem(id, {
        dayNumber: Number(itemDay),
        title: itemTitle,
        itemDate: itemDate || undefined,
        startTime: itemTime || undefined,
        locationName: itemLocation.trim() || undefined,
      }),
    onSuccess: async () => {
      setItemTitle('');
      setItemLocation('');
      setItemTime('');
      push({ tone: 'success', title: 'Itinerary item added' });
      await invalidateAll();
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : t('somethingWrong'),
      }),
  });

  const saveItem = useMutation({
    mutationFn: () => {
      if (!editingItem) throw new Error('No item');
      return itinerariesApi.updateItem(editingItem.id, {
        title: editingItem.title,
        dayNumber: editingItem.dayNumber,
        itemDate: editingItem.itemDate || undefined,
        startTime: editingItem.startTime || undefined,
        locationName: editingItem.locationName || undefined,
        status: editingItem.status,
        notes: editingItem.notes || undefined,
      });
    },
    onSuccess: async () => {
      setEditingItem(null);
      push({ tone: 'success', title: 'Itinerary item updated' });
      await invalidateAll();
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : t('somethingWrong'),
      }),
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => itinerariesApi.deleteItem(itemId),
    onSuccess: async () => {
      push({ tone: 'success', title: 'Itinerary item removed' });
      await invalidateAll();
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : t('somethingWrong'),
      }),
  });

  const recordPayment = useMutation({
    mutationFn: () =>
      paymentsApi.cash({
        bookingId: id,
        amount: Number(payAmount),
        method: payMethod,
        notes: payNotes.trim() || undefined,
      }),
    onSuccess: async () => {
      setPayAmount('');
      setPayNotes('');
      setPanel(null);
      push({ tone: 'success', title: 'Payment recorded' });
      await invalidateAll();
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : t('somethingWrong'),
      }),
  });

  const addGuide = useMutation({
    mutationFn: () =>
      operationsApi.addStaff(id, { staffId: guideStaffId, role: 'guide' }),
    onSuccess: async () => {
      setGuideStaffId('');
      setPanel(null);
      push({ tone: 'success', title: 'Guide assigned' });
      await invalidateAll();
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : t('somethingWrong'),
      }),
  });

  const removeGuide = useMutation({
    mutationFn: (linkId: string) => operationsApi.removeStaff(linkId),
    onSuccess: async () => {
      push({ tone: 'success', title: 'Guide removed' });
      await invalidateAll();
    },
  });

  const approveEdit = useMutation({
    mutationFn: (reqId: string) => editRequestsApi.approve(reqId),
    onSuccess: invalidateAll,
  });
  const rejectEdit = useMutation({
    mutationFn: (reqId: string) => editRequestsApi.reject(reqId),
    onSuccess: invalidateAll,
  });
  const resolveSos = useMutation({
    mutationFn: (sosId: string) => sosApi.resolve(sosId),
    onSuccess: async () => {
      push({ tone: 'success', title: 'SOS resolved' });
      await invalidateAll();
    },
  });

  if (booking.isLoading) return <Skeleton className="h-64" />;
  if (booking.isError || !booking.data) {
    return (
      <ErrorState
        description={booking.error?.message}
        onRetry={() => booking.refetch()}
      />
    );
  }

  const b = booking.data;
  const d = ops.data;
  const clientId = d?.clientId ?? b.client?.id;
  const itineraryItems = (itinerary.data ?? []) as ItineraryItem[];
  const vendors = d?.vendorBookings ?? [];
  const hotels = vendors.filter((v) => v.vendorType === 'hotel');
  const activities = vendors.filter((v) => v.vendorType === 'activity');
  const services = vendors.filter((v) => v.vendorType === 'service');
  const b2b = vendors.filter((v) => v.vendorType === 'b2b');
  const guidesStaff = (d?.staff ?? []).filter((s) => s.role === 'guide');
  const guideVendors = vendors.filter((v) => v.vendorType === 'guide');

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'client', label: 'Client' },
    { id: 'program', label: 'Trip Program', count: d?.counts.itineraryItems },
    { id: 'hotels', label: 'Hotels', count: hotels.length },
    { id: 'activities', label: 'Activities', count: activities.length },
    { id: 'services', label: 'Services', count: services.length },
    { id: 'b2b', label: 'B2B', count: b2b.length },
    { id: 'suppliers', label: 'Suppliers', count: vendors.length },
    { id: 'driver', label: 'Driver' },
    { id: 'guide', label: 'Guide', count: guidesStaff.length + guideVendors.length },
    { id: 'tasks', label: 'Tasks', count: d?.counts.tasksOpen },
    { id: 'payments', label: 'Payments' },
    { id: 'chat', label: 'Chat' },
    { id: 'edit-requests', label: 'Edit Requests', count: d?.counts.editRequestsPending },
    { id: 'sos', label: 'SOS', count: d?.counts.sosActive },
    { id: 'documents', label: 'Documents' },
    { id: 'history', label: 'History' },
  ];

  return (
    <PageScaffold
      title={b.znCode}
      description={`${b.client?.fullName ?? d?.clientName ?? t('common.client')} · ${formatDate(b.arrivalDate)} → ${formatDate(b.departureDate)} · PAX ${b.partySize}`}
      primaryAction={
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge
            tone={
              b.status === 'active'
                ? 'success'
                : b.status === 'cancelled'
                  ? 'danger'
                  : 'default'
            }
          >
            {b.status}
          </Badge>
          {b.isVip || d?.isVip ? <Badge tone="accent">VIP</Badge> : null}
          <Link to="/bookings">
            <Button variant="secondary">{t('back')}</Button>
          </Link>
        </div>
      }
    >
      <Card className="mb-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span>
            <span className="text-[var(--ink-muted)]">Package </span>
            {b.package?.name ?? d?.packageName ?? '—'}
          </span>
          <span>
            <span className="text-[var(--ink-muted)]">Created </span>
            {formatDate(d?.createdAt ?? b.createdAt)}
          </span>
          <span>
            <span className="text-[var(--ink-muted)]">Due </span>
            <strong className="text-[var(--accent)]">
              {formatMoney(b.dueAmount ?? d?.dueAmount ?? 0)}
            </strong>
          </span>
        </div>
        {(b.internalNotes || d?.internalNotes) && (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {b.internalNotes ?? d?.internalNotes}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPanel('edit')}>
            Edit Booking
          </Button>
          <Button variant="secondary" onClick={() => setPanel('driver')}>
            Assign Driver
          </Button>
          <Button variant="secondary" onClick={() => setPanel('guide')}>
            Assign Guide
          </Button>
          <Button variant="secondary" onClick={() => setAttach('hotel')}>
            Attach Hotel
          </Button>
          <Button variant="secondary" onClick={() => setAttach('activity')}>
            Attach Activity
          </Button>
          <Button variant="secondary" onClick={() => setAttach('service')}>
            Attach Service
          </Button>
          <Button variant="secondary" onClick={() => setAttach('b2b')}>
            Attach B2B
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setAttachVendorType('hotel');
              setAttach('vendor');
            }}
          >
            Attach Supplier
          </Button>
          <Button variant="secondary" onClick={() => setPanel('task')}>
            Create Task
          </Button>
          <Button variant="secondary" onClick={() => setPanel('payment')}>
            Record Payment
          </Button>
          <Button
            onClick={() => {
              setTab('chat');
            }}
          >
            Open Chat
          </Button>
        </div>
      </Card>

      <TabBar
        tabs={tabs}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      <div className="mt-4 space-y-4">
        {tab === 'overview' && d ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Booking">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">ZN</dt>
                  <dd className="font-semibold">{d.znCode}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Status</dt>
                  <dd>{d.status}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Package</dt>
                  <dd>{d.packageName ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Trip</dt>
                  <dd>
                    {formatDate(d.arrivalDate)} → {formatDate(d.departureDate)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">PAX</dt>
                  <dd>{d.partySize}</dd>
                </div>
              </dl>
            </SectionCard>
            <SectionCard title="Operational snapshot">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Driver</dt>
                  <dd>
                    {d.driverName ?? 'Unassigned'}
                    {d.assignmentStatus ? ` · ${d.assignmentStatus}` : ''}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Guide</dt>
                  <dd>
                    {guidesStaff[0]?.staffName ??
                      guideVendors[0]?.vendorName ??
                      'Unassigned'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Program items</dt>
                  <dd>{d.counts.itineraryItems}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Tasks open / done</dt>
                  <dd>
                    {d.counts.tasksOpen} / {d.counts.tasksDone}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Vendors</dt>
                  <dd>{d.counts.vendors}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Pending edits</dt>
                  <dd>{d.counts.editRequestsPending}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Active SOS</dt>
                  <dd className={d.counts.sosActive ? 'font-bold text-red-600' : ''}>
                    {d.counts.sosActive}
                  </dd>
                </div>
              </dl>
            </SectionCard>
            <SectionCard title="Payments">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Total</dt>
                  <dd>{formatMoney(d.totalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Paid</dt>
                  <dd>{formatMoney(d.paidAmount)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Due</dt>
                  <dd className="font-bold text-[var(--accent)]">
                    {formatMoney(d.dueAmount)}
                  </dd>
                </div>
              </dl>
            </SectionCard>
          </div>
        ) : null}

        {tab === 'client' ? (
          <SectionCard
            title="Client"
            action={
              <div className="flex flex-wrap gap-2">
                {clientId ? (
                  <Link to={`/clients/${id}`}>
                    <Button variant="secondary">Open booking profile</Button>
                  </Link>
                ) : null}
                <Button onClick={() => setPanel('edit')}>Edit Client / Booking</Button>
              </div>
            }
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--ink-muted)]">Name</dt>
                <dd className="font-semibold">{b.client?.fullName ?? d?.clientName}</dd>
              </div>
              <div>
                <dt className="text-[var(--ink-muted)]">Client ID</dt>
                <dd className="font-mono text-xs">{clientId ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--ink-muted)]">Phone</dt>
                <dd>{b.client?.phone ?? d?.clientPhone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--ink-muted)]">Email</dt>
                <dd>{b.client?.email ?? d?.clientEmail ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--ink-muted)]">Nationality</dt>
                <dd>{b.client?.nationality ?? d?.nationality ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--ink-muted)]">PAX</dt>
                <dd>{b.partySize}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-[var(--ink-muted)]">
              Note: `/clients/:id` still opens this booking profile for compatibility.
              Client ID above is the real CRM `clientId`.
            </p>
          </SectionCard>
        ) : null}

        {tab === 'program' ? (
          <SectionCard title="Trip Program">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                type="number"
                min={1}
                value={itemDay}
                onChange={(e) => setItemDay(Number(e.target.value))}
                placeholder="Day"
              />
              <Input type="date" value={itemDate} onChange={(e) => setItemDate(e.target.value)} />
              <Input type="time" value={itemTime} onChange={(e) => setItemTime(e.target.value)} />
              <Input
                placeholder="Location"
                value={itemLocation}
                onChange={(e) => setItemLocation(e.target.value)}
              />
              <Input
                placeholder="Activity title"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
              />
            </div>
            <Button
              className="mt-2"
              disabled={!itemTitle}
              loading={addItem.isPending}
              onClick={() => addItem.mutate()}
            >
              Add item
            </Button>
            <p className="mt-2 text-xs text-[var(--ink-muted)]">
              Reorder is not supported by the backend yet — not faked in UI.
            </p>
            {!itineraryItems.length ? (
              <div className="mt-4">
                <EmptyState title={t('bookings.noProgram')} />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {itineraryItems.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-[var(--line)] p-3 text-sm"
                  >
                    {editingItem?.id === item.id ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          value={editingItem.title}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, title: e.target.value })
                          }
                        />
                        <Input
                          type="number"
                          value={editingItem.dayNumber}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              dayNumber: Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="date"
                          value={editingItem.itemDate?.slice(0, 10) ?? ''}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, itemDate: e.target.value })
                          }
                        />
                        <Input
                          type="time"
                          value={editingItem.startTime?.slice(0, 5) ?? ''}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              startTime: e.target.value || null,
                            })
                          }
                        />
                        <Input
                          className="sm:col-span-2"
                          value={editingItem.locationName ?? ''}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              locationName: e.target.value,
                            })
                          }
                        />
                        <div className="flex gap-2 sm:col-span-2">
                          <Button loading={saveItem.isPending} onClick={() => saveItem.mutate()}>
                            Save
                          </Button>
                          <Button variant="secondary" onClick={() => setEditingItem(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            Day {item.dayNumber} · {item.title}
                          </p>
                          <p className="text-[var(--ink-muted)]">
                            {item.startTime ?? ''} {item.locationName ?? ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{item.status}</Badge>
                          <Button
                            variant="secondary"
                            onClick={() => setEditingItem(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            loading={deleteItem.isPending}
                            onClick={() => deleteItem.mutate(item.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {d?.days?.length ? (
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold">Day plans</h3>
                {d.days.map((day) => (
                  <div key={day.dayNumber} className="rounded-lg border border-[var(--line)] p-3">
                    <p className="font-semibold">
                      Day {day.dayNumber}
                      {day.planDate ? ` · ${formatDate(day.planDate)}` : ''}
                    </p>
                    {day.carPlan ? (
                      <p className="text-sm text-[var(--ink-muted)]">Car: {day.carPlan}</p>
                    ) : null}
                    <ul className="mt-2 space-y-1 text-sm">
                      {day.activities.map((a) => (
                        <li key={a.id}>
                          {a.startTime ?? '—'} {a.title}
                          {a.vendorName ? ` · ${a.vendorName}` : ''} · {a.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {tab === 'hotels' ? (
          <SectionCard
            title="Hotels"
            action={
              <Button onClick={() => setAttach('hotel')}>+ Attach Hotel</Button>
            }
          >
            <VendorList rows={hotels} empty="No hotels attached" />
          </SectionCard>
        ) : null}

        {tab === 'activities' ? (
          <SectionCard
            title="Activities & Events"
            action={
              <Button onClick={() => setAttach('activity')}>+ Attach Activity</Button>
            }
          >
            <VendorList rows={activities} empty="No activities attached" />
          </SectionCard>
        ) : null}

        {tab === 'services' ? (
          <SectionCard
            title="Services"
            action={
              <Button onClick={() => setAttach('service')}>+ Attach Service</Button>
            }
          >
            <VendorList rows={services} empty="No services attached" />
          </SectionCard>
        ) : null}

        {tab === 'b2b' ? (
          <SectionCard
            title="B2B Partners"
            action={<Button onClick={() => setAttach('b2b')}>+ Attach Partner</Button>}
          >
            <VendorList rows={b2b} empty="No B2B partners attached" />
          </SectionCard>
        ) : null}

        {tab === 'suppliers' ? (
          <SectionCard
            title="Suppliers & Vendors"
            action={
              <Button
                onClick={() => {
                  setAttachVendorType('hotel');
                  setAttach('vendor');
                }}
              >
                + Attach Supplier
              </Button>
            }
          >
            <VendorList rows={vendors} empty="No suppliers attached" />
          </SectionCard>
        ) : null}

        {tab === 'driver' ? (
          <SectionCard
            title="Driver"
            action={
              <Button onClick={() => setPanel('driver')}>+ Assign Driver</Button>
            }
          >
            {!d?.driverName && !b.activeDriverAssignment ? (
              <EmptyState title="No driver assigned" />
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Driver</dt>
                  <dd className="font-semibold">
                    {d?.driverName ?? b.activeDriverAssignment?.driverName}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Phone</dt>
                  <dd>{d?.driverPhone ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Vehicle</dt>
                  <dd>{d?.driverVehicle ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Status</dt>
                  <dd>
                    <Badge>
                      {d?.assignmentStatus ??
                        b.activeDriverAssignment?.status ??
                        '—'}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Dates</dt>
                  <dd>
                    {formatDate(d?.assignmentStartDate)} →{' '}
                    {formatDate(d?.assignmentEndDate)}
                  </dd>
                </div>
              </dl>
            )}
          </SectionCard>
        ) : null}

        {tab === 'guide' ? (
          <SectionCard
            title="Guide"
            action={
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPanel('guide')}>+ Assign Guide (staff)</Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAttachVendorType('guide');
                    setAttach('vendor');
                  }}
                >
                  + Attach Guide (catalog)
                </Button>
              </div>
            }
          >
            <p className="mb-3 text-xs text-[var(--ink-muted)]">
              Authoritative links: <code>BookingStaffLink.role=guide</code> and/or{' '}
              <code>VendorBooking</code> with <code>vendor.type=guide</code>.
            </p>
            {!guidesStaff.length && !guideVendors.length ? (
              <EmptyState title="No guide assigned" />
            ) : (
              <div className="space-y-4">
                {guidesStaff.length ? (
                  <ul className="space-y-2 text-sm">
                    {guidesStaff.map((g) => (
                      <li
                        key={g.id}
                        className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2"
                      >
                        <span>
                          {g.staffName} · staff link
                        </span>
                        <Button
                          variant="secondary"
                          onClick={() => removeGuide.mutate(g.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <VendorList rows={guideVendors} empty="No catalog guides attached" />
              </div>
            )}
          </SectionCard>
        ) : null}

        {tab === 'tasks' ? (
          <SectionCard
            title="Tasks"
            action={<Button onClick={() => setPanel('task')}>+ Create Task</Button>}
          >
            {!d?.tasks?.length ? (
              <EmptyState title="No tasks for this booking" />
            ) : (
              <ul className="space-y-2">
                {d.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--line)] pb-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{task.title}</p>
                      {task.description ? (
                        <p className="text-[var(--ink-muted)]">{task.description}</p>
                      ) : null}
                      <p className="text-xs text-[var(--ink-muted)]">
                        {task.assigneeName ?? 'Unassigned'} · Due{' '}
                        {formatDate(task.dueDate)} · {formatDate(task.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge tone={task.priority === 'urgent' ? 'danger' : 'default'}>
                        {task.priority}
                      </Badge>
                      <Badge tone={task.status === 'done' ? 'success' : 'default'}>
                        {task.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        ) : null}

        {tab === 'payments' ? (
          <SectionCard
            title="Payments"
            action={
              <Button onClick={() => setPanel('payment')}>+ Record Payment</Button>
            }
          >
            {!d?.payments?.length ? (
              <EmptyState title={t('bookings.noPayments')} />
            ) : (
              <ul className="space-y-2">
                {d.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between gap-3 border-b border-[var(--line)] pb-2 text-sm"
                  >
                    <span>
                      {p.method} · {p.status} · {formatDate(p.createdAt)}
                    </span>
                    <span className="font-semibold">{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        ) : null}

        {tab === 'chat' ? <BookingChatPanel bookingId={id} /> : null}

        {tab === 'edit-requests' ? (
          <SectionCard title="Edit Requests">
            {!d?.editRequests?.length ? (
              <EmptyState title="No edit requests" />
            ) : (
              <ul className="space-y-3">
                {d.editRequests.map((req) => (
                  <li
                    key={req.id}
                    className="rounded-lg border border-[var(--line)] p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        {req.type} · {formatDate(req.createdAt)}
                      </p>
                      <Badge>{req.status}</Badge>
                    </div>
                    {req.reason ? <p className="mt-1">{req.reason}</p> : null}
                    {req.status === 'pending' ? (
                      <div className="mt-2 flex gap-2">
                        <Button
                          loading={approveEdit.isPending}
                          onClick={() => approveEdit.mutate(req.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          loading={rejectEdit.isPending}
                          onClick={() => rejectEdit.mutate(req.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        ) : null}

        {tab === 'sos' ? (
          <SectionCard title="SOS Alerts">
            {!d?.sosAlerts?.length ? (
              <EmptyState title="No SOS alerts for this booking" />
            ) : (
              <ul className="space-y-3">
                {d.sosAlerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="rounded-lg border border-[var(--line)] p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone={alert.status === 'active' ? 'danger' : 'success'}>
                        {alert.status}
                      </Badge>
                      <span className="text-[var(--ink-muted)]">
                        {formatDate(alert.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2">{alert.message ?? 'SOS alert'}</p>
                    {alert.resolvedAt ? (
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        Resolved {formatDate(alert.resolvedAt)}
                      </p>
                    ) : (
                      <Button
                        className="mt-2"
                        loading={resolveSos.isPending}
                        onClick={() => resolveSos.mutate(alert.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        ) : null}

        {tab === 'documents' ? (
          <SectionCard title="Documents">
            <EmptyState
              title="Document storage is not yet configured"
              description="No Document model or upload storage exists in the backend. Phase 1 does not fake uploads."
            />
          </SectionCard>
        ) : null}

        {tab === 'history' ? (
          <SectionCard title="History">
            <EmptyState
              title="Booking history is not yet available"
              description="AuditLog exists but there is no booking History read API. Phase 1 does not invent activity rows."
            />
          </SectionCard>
        ) : null}
      </div>

      {panel === 'driver' && b ? (
        <DialogShell open title="Assign Driver" onClose={() => setPanel(null)}>
          <AssignDriverPanel booking={b} onClose={() => setPanel(null)} />
        </DialogShell>
      ) : null}

      {panel === 'task' && b ? (
        <DialogShell open title="Create Task" onClose={() => setPanel(null)}>
          <NewTaskPanel booking={b} onClose={() => setPanel(null)} />
        </DialogShell>
      ) : null}

      {panel === 'edit' && b ? (
        <DialogShell open title="Edit Booking / Client" onClose={() => setPanel(null)}>
          <ClientEditForm
            booking={b}
            onCancel={() => setPanel(null)}
            onSaved={async () => {
              setPanel(null);
              await invalidateAll();
            }}
          />
        </DialogShell>
      ) : null}

      {panel === 'payment' ? (
        <DialogShell open title="Record Payment" onClose={() => setPanel(null)}>
          <div className="space-y-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="mt-1"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                className="mt-1 w-full"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as CashMethod)}
              >
                <option value="cash">Cash</option>
                <option value="rajhi_transfer">Rajhi transfer</option>
                <option value="usdt_trc20">USDT TRC20</option>
                <option value="usdt_bep20">USDT BEP20</option>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPanel(null)}>
                Cancel
              </Button>
              <Button
                disabled={!payAmount || Number(payAmount) <= 0}
                loading={recordPayment.isPending}
                onClick={() => recordPayment.mutate()}
              >
                Record
              </Button>
            </div>
          </div>
        </DialogShell>
      ) : null}

      {panel === 'guide' ? (
        <DialogShell open title="Assign Guide" onClose={() => setPanel(null)}>
          <div className="space-y-3">
            <Label>Staff user</Label>
            <Select
              className="w-full"
              value={guideStaffId}
              onChange={(e) => setGuideStaffId(e.target.value)}
            >
              <option value="">Choose…</option>
              {(staffUsers.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} · {u.role}
                </option>
              ))}
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPanel(null)}>
                Cancel
              </Button>
              <Button
                disabled={!guideStaffId}
                loading={addGuide.isPending}
                onClick={() => addGuide.mutate()}
              >
                Assign
              </Button>
            </div>
          </div>
        </DialogShell>
      ) : null}

      {attach && attach !== 'vendor' ? (
        <BookingAttachVendorDialog
          open
          bookingId={id}
          vendorType={ATTACH_META[attach].type}
          title={ATTACH_META[attach].title}
          onClose={() => setAttach(null)}
        />
      ) : null}

      {attach === 'vendor' ? (
        <DialogShell open title="Attach Supplier / Vendor" onClose={() => setAttach(null)}>
          <div className="space-y-3">
            <div>
              <Label>Vendor type</Label>
              <Select
                className="mt-1 w-full"
                value={attachVendorType}
                onChange={(e) => setAttachVendorType(e.target.value)}
              >
                <option value="hotel">Hotel</option>
                <option value="activity">Activity</option>
                <option value="service">Service</option>
                <option value="b2b">B2B</option>
                <option value="guide">Guide</option>
                <option value="restaurant">Restaurant</option>
                <option value="bus">Bus</option>
              </Select>
            </div>
            <VendorAttachInline
              bookingId={id}
              vendorType={attachVendorType}
              onDone={() => setAttach(null)}
              onCancel={() => setAttach(null)}
            />
          </div>
        </DialogShell>
      ) : null}
    </PageScaffold>
  );
}
