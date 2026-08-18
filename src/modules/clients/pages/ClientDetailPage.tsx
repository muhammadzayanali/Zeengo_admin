import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '@/modules/clients/bookings/services/bookings.api';
import { tasksApi } from '@/modules/command/tasks/services/tasks.api';
import {
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
  TabBar,
  useToast,
} from '@/shared/ui';
import { ClientPaymentBar } from '../components/ClientPaymentBar';
import { AssignDriverPanel } from '../components/AssignDriverPanel';
import { NewTaskPanel } from '../components/NewTaskPanel';
import { ClientEditForm } from '../components/ClientEditForm';
import { ClientInfoTab } from '../components/ClientInfoTab';
import { formatDate, formatMoney, cn } from '@/shared/lib/cn';

type Panel = 'none' | 'driver' | 'task';
type TabId = 'info' | 'program' | 'payments' | 'chat' | 'checklist' | 'notes';

export function ClientDetailPage() {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const qc = useQueryClient();

  const bookingQuery = useQuery({
    queryKey: ['bookings', id],
    queryFn: ({ signal }) => bookingsApi.get(id, signal),
    enabled: Boolean(id),
  });

  const tasksQuery = useQuery({
    queryKey: ['tasks', id],
    queryFn: ({ signal }) =>
      tasksApi.list({ bookingId: id, limit: 50 }, signal),
    enabled: Boolean(id),
  });

  const checklistQuery = useQuery({
    queryKey: ['bookings', id, 'checklist'],
    queryFn: ({ signal }) => bookingsApi.checklist(id, signal),
    enabled: Boolean(id),
  });

  const notesQuery = useQuery({
    queryKey: ['bookings', id, 'notes'],
    queryFn: ({ signal }) => bookingsApi.notes(id, signal),
    enabled: Boolean(id),
  });

  const paymentsQuery = useQuery({
    queryKey: ['bookings', id, 'payments'],
    queryFn: ({ signal }) => bookingsApi.payments(id, signal),
    enabled: Boolean(id),
  });

  const panelFromUrl = searchParams.get('panel') === 'driver' ? 'driver' : null;
  const [tab, setTab] = useState<TabId>('info');
  const [panel, setPanel] = useState<Panel>(panelFromUrl === 'driver' ? 'driver' : 'none');
  const [editing, setEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  const toggleCheck = useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: string; isDone: boolean }) =>
      bookingsApi.patchChecklist(id, itemId, { isDone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings', id, 'checklist'] });
    },
  });

  const completeTask = useMutation({
    mutationFn: (taskId: string) => tasksApi.complete(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', id] });
    },
  });

  const booking = bookingQuery.data;
  const tasks = tasksQuery.data?.data ?? [];
  const checklist = checklistQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  const checklistDone = useMemo(
    () => checklist.filter((c) => c.isDone).length,
    [checklist],
  );

  if (bookingQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (bookingQuery.isError || !booking) {
    return (
      <EmptyState
        title="Client booking not found"
        description={bookingQuery.error?.message ?? 'This record may have been removed.'}
        action={
          <Button variant="secondary" onClick={() => navigate('/clients')}>
            Back to clients
          </Button>
        }
      />
    );
  }

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'program', label: 'Program' },
    { id: 'payments', label: 'Payments' },
    { id: 'chat', label: 'Chat' },
    {
      id: 'checklist',
      label: 'Checklist',
      count: checklist.length ? checklistDone : undefined,
    },
    { id: 'notes', label: 'Notes' },
  ];

  function togglePanel(next: Panel) {
    setEditing(false);
    setPanel((p) => {
      const nextVal = p === next ? 'none' : next;
      if (nextVal === 'driver') setSearchParams({ panel: 'driver' });
      else setSearchParams({});
      return nextVal;
    });
  }

  function closePanel() {
    setPanel('none');
    setSearchParams({});
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="mt-1 rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
            aria-label="Back"
          >
            ←
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-[var(--ink)] md:text-2xl">
                {booking.client?.fullName ?? booking.znCode}
              </h1>
              <StatusBadge
                tone={
                  booking.status === 'active'
                    ? 'success'
                    : booking.status === 'cancelled'
                      ? 'danger'
                      : 'default'
                }
              >
                {booking.status === 'active'
                  ? 'Active'
                  : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </StatusBadge>
              {booking.isVip ? <StatusBadge tone="accent">VIP</StatusBadge> : null}
            </div>
            <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
              {booking.znCode} · {booking.client?.nationality || '—'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <IconBtn
            active={panel === 'driver'}
            title="Assign driver"
            onClick={() => togglePanel('driver')}
          >
            <CarIcon />
          </IconBtn>
          <IconBtn
            active={panel === 'task'}
            highlight
            title="New task"
            onClick={() => togglePanel('task')}
          >
            <PlusIcon />
          </IconBtn>
          <IconBtn
            active={editing}
            title="Edit profile"
            onClick={() => {
              setPanel('none');
              setEditing((v) => !v);
            }}
          >
            <PencilIcon />
          </IconBtn>
        </div>
      </header>

      {panel === 'driver' ? (
        <AssignDriverPanel booking={booking} onClose={closePanel} />
      ) : null}
      {panel === 'task' ? (
        <NewTaskPanel booking={booking} onClose={closePanel} />
      ) : null}

      <ClientPaymentBar booking={booking} />

      {editing ? (
        <ClientEditForm
          booking={booking}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      ) : (
        <>
          <TabBar tabs={tabs} value={tab} onChange={(tid) => setTab(tid as TabId)} />

          {tab === 'info' ? <ClientInfoTab booking={booking} /> : null}

          {tab === 'program' ? (
            <SectionCard title="Program / Tasks">
              {!tasks.length ? (
                <p className="text-sm text-[var(--ink-muted)]">No tasks yet. Use + to create one.</p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2 text-sm last:border-0"
                    >
                      <span>
                        {t.title}
                        {t.dueDate ? (
                          <span className="ms-2 text-xs text-[var(--ink-muted)]">
                            due {formatDate(t.dueDate)}
                          </span>
                        ) : null}
                      </span>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          tone={
                            t.status === 'done'
                              ? 'success'
                              : t.priority === 'urgent'
                                ? 'danger'
                                : 'default'
                          }
                        >
                          {t.status}
                        </StatusBadge>
                        {t.status !== 'done' ? (
                          <Button
                            variant="secondary"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => completeTask.mutate(t.id)}
                          >
                            Done
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          ) : null}

          {tab === 'payments' ? (
            <SectionCard title="Payments">
              {!payments.length ? (
                <p className="text-sm text-[var(--ink-muted)]">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2 text-sm last:border-0"
                    >
                      <span>
                        {p.method} · {p.status}
                        <span className="ms-2 text-xs text-[var(--ink-muted)]">
                          {formatDate(p.createdAt)}
                        </span>
                      </span>
                      <span className="font-semibold">{formatMoney(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          ) : null}

          {tab === 'chat' ? (
            <SectionCard title="Chat">
              <p className="text-sm text-[var(--ink-muted)]">
                Use the team chat module for staff conversations.
              </p>
              <Link
                to="/chat"
                className="mt-2 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Open team chat →
              </Link>
            </SectionCard>
          ) : null}

          {tab === 'checklist' ? (
            <SectionCard
              title={`Checklist${checklist.length ? ` · ${checklistDone}/${checklist.length}` : ''}`}
            >
              {!checklist.length ? (
                <p className="text-sm text-[var(--ink-muted)]">No checklist items yet.</p>
              ) : (
                <ul className="space-y-2">
                  {checklist.map((item) => (
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
              )}
            </SectionCard>
          ) : null}

          {tab === 'notes' ? (
            <SectionCard title="Notes">
              {booking.internalNotes ? (
                <p className="mb-4 whitespace-pre-wrap text-sm">{booking.internalNotes}</p>
              ) : (
                <p className="mb-4 text-sm text-[var(--ink-muted)]">No internal notes on booking.</p>
              )}
              <ul className="mb-4 space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="border-b border-[var(--line)] pb-2 text-sm last:border-0">
                    <p>{n.body}</p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {n.authorName ?? 'Staff'} · {formatDate(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
              <textarea
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
                rows={3}
                placeholder="Add a note..."
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <Button
                className="mt-2"
                disabled={!noteDraft.trim()}
                onClick={async () => {
                  try {
                    await bookingsApi.addNote(id, noteDraft.trim());
                    setNoteDraft('');
                    push({ tone: 'success', title: 'Note saved' });
                    qc.invalidateQueries({ queryKey: ['bookings', id, 'notes'] });
                  } catch {
                    push({ tone: 'error', title: 'Could not save note' });
                  }
                }}
              >
                Save note
              </Button>
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  highlight,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  highlight?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition',
        active
          ? highlight
            ? 'border-amber-400 bg-amber-400 text-white'
            : 'border-[var(--accent)] bg-[var(--accent)] text-white'
          : highlight
            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
      )}
    >
      {children}
    </button>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}
