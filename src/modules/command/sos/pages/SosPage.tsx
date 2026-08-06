import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, MessageSquare, CheckCircle2, Phone } from 'lucide-react';
import { sosApi } from '../services/sos.api';
import { bookingsApi } from '@/modules/clients/bookings/services/bookings.api';
import {
  Button,
  DetailDrawer,
  DialogShell,
  ErrorState,
  PageScaffold,
  SearchBar,
  Skeleton,
  StatusBadge,
  TabBar,
  Textarea,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { Booking, SosAlert } from '@/shared/api/types';

function elapsedLabel(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

function responseMinutes(createdAt: string, resolvedAt?: string | null) {
  if (!resolvedAt) return null;
  return Math.max(
    0,
    Math.round((new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 60_000),
  );
}

export function SosPage() {
  const { push } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [q, setQ] = useState('');
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileBooking, setFileBooking] = useState<Booking | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const listQuery = useQuery({
    queryKey: ['sos', tab],
    queryFn: ({ signal }) =>
      sosApi.list(
        {
          page: 1,
          limit: 50,
          status: tab === 'active' ? 'active' : 'resolved',
        },
        signal,
      ),
    staleTime: 10_000,
    refetchInterval: tab === 'active' ? 20_000 : false,
  });

  const list = useMemo(() => {
    const rows = listQuery.data?.data ?? [];
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((s) =>
      `${s.clientName ?? ''} ${s.znCode ?? ''} ${s.message ?? ''}`
        .toLowerCase()
        .includes(needle),
    );
  }, [listQuery.data, q]);

  const activeCountQuery = useQuery({
    queryKey: ['sos', 'active-count'],
    queryFn: ({ signal }) => sosApi.list({ page: 1, limit: 1, status: 'active' }, signal),
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
  const activeCount = activeCountQuery.data?.meta.total ?? 0;

  async function openFile(s: SosAlert) {
    setFileId(s.id);
    setFileBooking(null);
    if (!s.bookingId) return;
    setFileLoading(true);
    try {
      const b = await bookingsApi.get(s.bookingId);
      setFileBooking(b);
    } catch (err) {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : 'Could not load booking file',
      });
    } finally {
      setFileLoading(false);
    }
  }

  async function submitResolve() {
    if (!resolveId) return;
    setResolving(true);
    try {
      await sosApi.resolve(resolveId);
      push({
        tone: 'success',
        title: notes.trim()
          ? 'SOS resolved'
          : 'SOS resolved',
        description: notes.trim() || undefined,
      });
      setResolveId(null);
      setNotes('');
      await qc.invalidateQueries({ queryKey: ['sos'] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : 'Resolve failed',
      });
    } finally {
      setResolving(false);
    }
  }

  return (
    <PageScaffold
      title="SOS Alerts"
      description="Critical emergency monitoring. Active alerts outrank all other ops work."
      filters={
        <>
          <TabBar
            value={tab}
            onChange={(id) => setTab(id as 'active' | 'history')}
            tabs={[
              { id: 'active', label: 'Active', count: activeCount },
              { id: 'history', label: 'History' },
            ]}
          />
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Search client / ZN…"
            className="max-w-xs"
          />
        </>
      }
    >
      {listQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <ErrorState
          description={listQuery.error?.message ?? 'Could not load SOS alerts'}
          onRetry={() => listQuery.refetch()}
        />
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
          {tab === 'active' ? 'All clear — no active emergencies' : 'No historical SOS events'}
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((s) => {
            const mins = responseMinutes(s.createdAt, s.resolvedAt);
            return (
              <div
                key={s.id}
                className={
                  s.status === 'active'
                    ? 'rounded-[var(--radius)] border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_6%,transparent)] p-4 shadow-[var(--shadow)]'
                    : 'rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]'
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--danger)]">
                      {s.status === 'active' ? 'Emergency alert' : 'Resolved event'}
                    </p>
                    <p className="mt-1 text-base font-semibold">
                      {s.clientName ?? 'Client'} · {s.znCode ?? '—'}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">
                      Triggered {elapsedLabel(s.createdAt)}
                      {mins != null ? ` · Response ${mins}m` : ''}
                    </p>
                    {s.message ? (
                      <p className="mt-1 text-sm text-[var(--ink)]">{s.message}</p>
                    ) : null}
                    {s.lat != null && s.lng != null ? (
                      <p className="mt-1 font-mono text-xs text-[var(--ink-muted)]">
                        {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                      </p>
                    ) : null}
                    {s.clientPhone ? (
                      <a
                        href={`tel:${s.clientPhone}`}
                        className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--accent)]"
                      >
                        <Phone className="h-3.5 w-3.5" /> {s.clientPhone}
                      </a>
                    ) : null}
                  </div>
                  <StatusBadge tone={s.status === 'active' ? 'danger' : 'success'}>
                    {s.status.toUpperCase()}
                  </StatusBadge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => void openFile(s)}>
                    <FolderOpen className="h-4 w-4" /> View File
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => push({ tone: 'success', title: 'Open Chat to coordinate (team chat)' })}
                  >
                    <MessageSquare className="h-4 w-4" /> In-App Chat
                  </Button>
                  {s.status === 'active' ? (
                    <Button type="button" onClick={() => setResolveId(s.id)}>
                      <CheckCircle2 className="h-4 w-4" /> Resolve
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DetailDrawer
        open={Boolean(fileId)}
        title={fileBooking ? `${fileBooking.znCode} · File` : 'Client file'}
        onClose={() => {
          setFileId(null);
          setFileBooking(null);
        }}
      >
        {fileLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : fileBooking ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--ink-muted)]">Client</dt>
              <dd>{fileBooking.client?.fullName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--ink-muted)]">Phone</dt>
              <dd>{fileBooking.client?.phone ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--ink-muted)]">Email</dt>
              <dd className="break-all">{fileBooking.client?.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--ink-muted)]">Package</dt>
              <dd>{fileBooking.package?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--ink-muted)]">Arrival</dt>
              <dd>{fileBooking.arrivalDate ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--ink-muted)]">Driver</dt>
              <dd>{fileBooking.activeDriverAssignment?.driverName ?? 'Unassigned'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--ink-muted)]">Status</dt>
              <dd>{fileBooking.status}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">No booking file linked.</p>
        )}
      </DetailDrawer>

      <DialogShell
        open={Boolean(resolveId)}
        title="Resolve SOS — protocol"
        onClose={() => setResolveId(null)}
      >
        <p className="mb-3 text-sm text-[var(--ink-muted)]">
          Confirm resolution after phone contact / dispatch. Optional staff notes below.
        </p>
        <Textarea
          rows={3}
          placeholder="Resolution notes (logged locally for ops handoff)…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setResolveId(null)}>
            Cancel
          </Button>
          <Button type="button" loading={resolving} onClick={() => void submitResolve()}>
            Mark resolved
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
