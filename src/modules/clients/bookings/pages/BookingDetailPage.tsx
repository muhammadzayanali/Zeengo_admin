import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { bookingsApi } from '../services/bookings.api';
import { itinerariesApi } from '@/modules/command/itineraries/services/itineraries.api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Skeleton,
  Textarea,
  useToast,
} from '@/shared/ui';
import { formatDate, formatMoney } from '@/shared/lib/cn';
import { ApiClientError } from '@/shared/api/client';
import type { ChecklistItem, BookingNote, ItineraryItem } from '@/shared/api/types';

export function BookingDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { push } = useToast();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [checkTitle, setCheckTitle] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemDay, setItemDay] = useState(1);
  const [itemDate, setItemDate] = useState('');
  const [itemTime, setItemTime] = useState('');
  const [itemLocation, setItemLocation] = useState('');

  const booking = useQuery({
    queryKey: ['bookings', id],
    queryFn: ({ signal }) => bookingsApi.get(id, signal),
    enabled: Boolean(id),
  });
  const checklist = useQuery({
    queryKey: ['bookings', id, 'checklist'],
    queryFn: ({ signal }) => bookingsApi.checklist(id, signal),
    enabled: Boolean(id),
  });
  const notes = useQuery({
    queryKey: ['bookings', id, 'notes'],
    queryFn: ({ signal }) => bookingsApi.notes(id, signal),
    enabled: Boolean(id),
  });
  const payments = useQuery({
    queryKey: ['bookings', id, 'payments'],
    queryFn: ({ signal }) => bookingsApi.payments(id, signal),
    enabled: Boolean(id),
  });
  const itinerary = useQuery({
    queryKey: ['bookings', id, 'itinerary'],
    queryFn: ({ signal }) => itinerariesApi.forBooking(id, signal),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['bookings', id] });
  };

  const addNote = useMutation({
    mutationFn: () => bookingsApi.addNote(id, note),
    onSuccess: () => {
      setNote('');
      push({ tone: 'success', title: t('bookings.addNote') });
      invalidate();
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: t('somethingWrong'),
        description: e instanceof ApiClientError ? e.message : undefined,
      }),
  });
  const addCheck = useMutation({
    mutationFn: () => bookingsApi.addChecklist(id, { title: checkTitle }),
    onSuccess: () => {
      setCheckTitle('');
      invalidate();
    },
  });
  const toggleCheck = useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: string; isDone: boolean }) =>
      bookingsApi.patchChecklist(id, itemId, { isDone }),
    onSuccess: invalidate,
  });
  const addItem = useMutation({
    mutationFn: () =>
      itinerariesApi.addItem(id, {
        dayNumber: Number(itemDay),
        title: itemTitle,
        itemDate: itemDate || undefined,
        startTime: itemTime || undefined,
        locationName: itemLocation.trim() || undefined,
      }),
    onSuccess: () => {
      setItemTitle('');
      setItemLocation('');
      setItemTime('');
      invalidate();
      qc.invalidateQueries({ queryKey: ['bookings', id, 'itinerary'] });
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
  const checklistItems = (checklist.data ?? []) as ChecklistItem[];
  const noteItems = (notes.data ?? []) as BookingNote[];
  const itineraryItems = (itinerary.data ?? []) as ItineraryItem[];

  return (
    <PageScaffold
      title={b.znCode}
      description={`${b.client?.fullName ?? t('common.client')} · ${formatDate(b.arrivalDate)} → ${formatDate(b.departureDate)}`}
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
              {b.status === 'active'
                ? 'Active'
                : b.status === 'cancelled'
                  ? 'Cancelled'
                  : b.status === 'completed'
                    ? 'Completed'
                    : b.status}
            </Badge>
            {b.isVip ? <Badge tone="accent">VIP</Badge> : null}
            <Link to="/bookings">
              <Button variant="secondary">{t('back')}</Button>
            </Link>
          </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-lg font-bold">{t('bookings.overview')}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">{t('bookings.package')}</dt>
              <dd>{b.package?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">{t('bookings.party')}</dt>
              <dd>{b.partySize}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">{t('bookings.total')}</dt>
              <dd>{formatMoney(b.totalAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">{t('bookings.paid')}</dt>
              <dd>{formatMoney(b.paidAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">{t('bookings.due')}</dt>
              <dd className="font-bold text-[var(--accent)]">
                {formatMoney(b.dueAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">{t('common.phone')}</dt>
              <dd>{b.client?.phone ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ink-muted)]">{t('bookings.driver')}</dt>
              <dd>{b.activeDriverAssignment?.driverName ?? t('bookings.unassigned')}</dd>
            </div>
          </dl>
          {b.internalNotes ? (
            <p className="mt-4 text-sm text-[var(--ink-muted)]">{b.internalNotes}</p>
          ) : null}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-bold">{t('bookings.itinerary')}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              className="w-full"
              type="number"
              min={1}
              value={itemDay}
              onChange={(e) => setItemDay(Number(e.target.value))}
              placeholder={t('bookings.day')}
            />
            <Input
              type="date"
              value={itemDate}
              onChange={(e) => setItemDate(e.target.value)}
            />
            <Input
              type="time"
              value={itemTime}
              onChange={(e) => setItemTime(e.target.value)}
            />
            <Input
              placeholder={t('bookings.location')}
              value={itemLocation}
              onChange={(e) => setItemLocation(e.target.value)}
            />
            <Input
              className="sm:col-span-2 lg:col-span-1"
              placeholder={t('bookings.activityTitle')}
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
            />
          </div>
          <div className="mt-2">
            <Button
              disabled={!itemTitle}
              loading={addItem.isPending}
              onClick={() => addItem.mutate()}
            >
              {t('add')}
            </Button>
          </div>
          {!itineraryItems.length ? (
            <div className="mt-4">
              <EmptyState title={t('bookings.noProgram')} />
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {itineraryItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-semibold">
                      Day {item.dayNumber} · {item.title}
                    </p>
                    <p className="text-[var(--ink-muted)]">
                      {item.startTime ?? ''} {item.locationName ?? ''}
                    </p>
                  </div>
                  <Badge>{item.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-bold">{t('bookings.checklist')}</h2>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder={t('bookings.newItem')}
              value={checkTitle}
              onChange={(e) => setCheckTitle(e.target.value)}
            />
            <Button
              disabled={!checkTitle}
              loading={addCheck.isPending}
              onClick={() => addCheck.mutate()}
            >
              {t('add')}
            </Button>
          </div>
          <ul className="mt-4 space-y-2">
            {checklistItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(item.isDone)}
                  onChange={(e) =>
                    toggleCheck.mutate({
                      itemId: item.id,
                      isDone: e.target.checked,
                    })
                  }
                />
                <span
                  className={
                    item.isDone ? 'line-through text-[var(--ink-muted)]' : ''
                  }
                >
                  {item.title}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">{t('bookings.notes')}</h2>
          <Label>{t('bookings.addNote')}</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          <Button
            className="mt-2"
            disabled={!note.trim()}
            loading={addNote.isPending}
            onClick={() => addNote.mutate()}
          >
            {t('bookings.saveNote')}
          </Button>
          <ul className="mt-4 space-y-3">
            {noteItems.map((n) => (
              <li
                key={n.id}
                className="border-b border-[var(--line)] pb-2 text-sm last:border-0"
              >
                <p>{n.body}</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {n.authorName ?? t('roles.staff')} · {formatDate(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">{t('bookings.payments')}</h2>
          {!payments.data?.length ? (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">{t('bookings.noPayments')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {payments.data.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between gap-3 border-b border-[var(--line)] pb-2 text-sm last:border-0"
                >
                  <span>
                    {p.method} · {p.status}
                  </span>
                  <span className="font-semibold">{formatMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageScaffold>
  );
}
