import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  editRequestKeys,
  editRequestsApi,
} from '../services/edit-requests.api';
import {
  Button,
  DetailDrawer,
  DialogShell,
  EmptyState,
  ErrorState,
  Label,
  PageScaffold,
  SearchBar,
  Skeleton,
  StatusBadge,
  TabBar,
  Textarea,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatDate } from '@/shared/lib/cn';
import type { EditRequest } from '@/shared/api/types';

type StatusTab = 'pending' | 'approved' | 'rejected' | 'all';

const PAGE_SIZE = 30;

const TYPE_LABELS: Record<string, string> = {
  date_change: 'Date change',
  itinerary_change: 'Itinerary change',
  vip_upgrade: 'VIP upgrade',
  other: 'Other',
};

function typeLabel(type: string) {
  return TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}

function elapsedLabel(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 48) return `${Math.floor(m / 60)}h ${m % 60}m ago`;
  return formatDate(iso);
}

function formatSubmittedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanReason(reason: string | null | undefined) {
  if (!reason?.trim()) return null;
  return reason.replace(/^\[seed\]\s*/i, '').trim();
}

function formatValue(raw: string | null | undefined): string {
  if (!raw?.trim()) return '—';
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if ('arrivalDate' in parsed || 'departureDate' in parsed) {
        const a = parsed.arrivalDate == null ? '—' : String(parsed.arrivalDate);
        const d = parsed.departureDate == null ? '—' : String(parsed.departureDate);
        return `Trip ${a} → ${d}`;
      }
      if ('isVip' in parsed) {
        return parsed.isVip ? 'VIP' : 'Standard';
      }
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v == null ? '—' : String(v)}`)
        .join(' · ');
    }
  } catch {
    // plain text
  }
  return raw;
}

function statusTone(status: EditRequest['status']) {
  if (status === 'pending') return 'warning' as const;
  if (status === 'approved') return 'success' as const;
  return 'danger' as const;
}

export function EditRequestsPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<StatusTab>('pending');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  // Debounce search so typing does not spam list API
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [q]);

  const statsQuery = useQuery({
    queryKey: editRequestKeys.stats(),
    queryFn: ({ signal }) => editRequestsApi.stats(signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const listQuery = useQuery({
    queryKey: editRequestKeys.list({ tab, page, search }),
    queryFn: ({ signal }) =>
      editRequestsApi.list(
        {
          page,
          limit: PAGE_SIZE,
          status: tab === 'all' ? undefined : tab,
          search: search || undefined,
        },
        signal,
      ),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    // Light poll only on pending inbox; not for other tabs, not for stats
    refetchInterval: tab === 'pending' && !search ? 60_000 : false,
  });

  const rows = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;
  const counts = statsQuery.data;

  const detail = useMemo(
    () => rows.find((r) => r.id === detailId) ?? null,
    [rows, detailId],
  );

  const detailQuery = useQuery({
    queryKey: editRequestKeys.detail(detailId ?? ''),
    queryFn: ({ signal }) => editRequestsApi.get(detailId!, signal),
    enabled: Boolean(detailId) && !detail,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const activeDetail = detail ?? detailQuery.data ?? null;

  async function refreshInbox() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: editRequestKeys.lists() }),
      qc.invalidateQueries({ queryKey: editRequestKeys.stats() }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => editRequestsApi.approve(id),
    onSuccess: async () => {
      push({
        tone: 'success',
        title: t('editRequests.approvedToast'),
        description: t('editRequests.approvedDesc'),
      });
      setDetailId(null);
      await refreshInbox();
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      editRequestsApi.reject(id, notes),
    onSuccess: async () => {
      push({
        tone: 'success',
        title: t('editRequests.rejectedToast'),
        description: t('editRequests.rejectedDesc'),
      });
      setRejectId(null);
      setFeedback('');
      setDetailId(null);
      await refreshInbox();
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const busyId =
    (approveMutation.isPending && approveMutation.variables) ||
    (rejectMutation.isPending && rejectMutation.variables?.id) ||
    null;

  function handleReject() {
    if (!rejectId) return;
    if (!feedback.trim()) {
      push({ tone: 'error', title: t('editRequests.reasonRequired') });
      return;
    }
    rejectMutation.mutate({ id: rejectId, notes: feedback.trim() });
  }

  const totalPages = meta
    ? Math.max(1, Math.ceil(meta.total / meta.limit))
    : 1;

  return (
    <PageScaffold
      title={t('editRequests.title')}
      description={t('editRequests.description')}
      filters={
        <div className="flex w-full flex-col gap-3">
          <TabBar
            value={tab}
            onChange={(id) => {
              setTab(id as StatusTab);
              setPage(1);
            }}
            tabs={[
              {
                id: 'pending',
                label: t('editRequests.tabPending'),
                count: counts?.pending,
              },
              {
                id: 'approved',
                label: t('editRequests.tabApproved'),
                count: counts?.approved,
              },
              {
                id: 'rejected',
                label: t('editRequests.tabRejected'),
                count: counts?.rejected,
              },
              {
                id: 'all',
                label: t('editRequests.tabAll'),
                count: counts?.all,
              },
            ]}
          />
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder={t('editRequests.search')}
            className="max-w-sm"
          />
        </div>
      }
    >
      {listQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : listQuery.isError ? (
        <ErrorState
          title={t('editRequests.loadFailed')}
          description={
            listQuery.error instanceof ApiClientError
              ? listQuery.error.message
              : undefined
          }
          onRetry={() => void listQuery.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t('editRequests.empty')}
          description={
            tab === 'pending'
              ? t('editRequests.emptyPending')
              : t('editRequests.emptyFiltered')
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((er) => (
            <article
              key={er.id}
              className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(er.status)}>{er.status}</StatusBadge>
                    <StatusBadge tone="default">{typeLabel(er.type)}</StatusBadge>
                    <span className="text-xs text-[var(--ink-muted)]">
                      {formatSubmittedAt(er.createdAt)}
                      <span className="ms-1.5 opacity-70">
                        ({elapsedLabel(er.createdAt)})
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="block text-start text-base font-semibold text-[var(--accent)] hover:underline"
                    onClick={() => setDetailId(er.id)}
                  >
                    {er.clientName ?? t('editRequests.unknownClient')}
                    {er.znCode ? (
                      <span className="ms-2 font-mono text-sm font-medium text-[var(--ink-muted)]">
                        {er.znCode}
                      </span>
                    ) : null}
                  </button>
                  {er.targetDate ? (
                    <p className="text-xs text-[var(--ink-muted)]">
                      {t('editRequests.targetDate')}:{' '}
                      <span className="font-medium text-[var(--ink)]">{er.targetDate}</span>
                      {er.departureDate ? ` → ${er.departureDate}` : null}
                    </p>
                  ) : null}
                </div>
                {er.status === 'pending' ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={busyId === er.id}
                      onClick={() => approveMutation.mutate(er.id)}
                    >
                      {t('editRequests.approve')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyId === er.id}
                      onClick={() => {
                        setRejectId(er.id);
                        setFeedback('');
                      }}
                    >
                      {t('editRequests.reject')}
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setDetailId(er.id)}>
                    {t('editRequests.view')}
                  </Button>
                )}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-[var(--bg-muted)] p-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                    {t('editRequests.change')}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)] line-through">
                    {formatValue(er.originalValue)}
                  </p>
                  <p className="mt-0.5 font-medium text-[var(--ink)]">
                    {formatValue(er.requestedValue)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--bg-muted)] p-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                    {t('editRequests.clientNote')}
                  </p>
                  <p className="mt-1 text-[var(--ink)]">
                    {cleanReason(er.reason)
                      ? `“${cleanReason(er.reason)}”`
                      : t('editRequests.noReason')}
                  </p>
                </div>
              </div>

              {er.status === 'approved' && er.reviewedByName ? (
                <p className="mt-3 text-xs text-[var(--ink-muted)]">
                  {t('editRequests.approvedBy', {
                    name: er.reviewedByName,
                    when: er.reviewedAt
                      ? formatSubmittedAt(er.reviewedAt)
                      : '—',
                  })}
                </p>
              ) : null}
              {er.status === 'rejected' && er.reviewNotes ? (
                <p className="mt-3 text-xs text-[var(--danger)]">
                  {t('editRequests.rejectionNote')}: {er.reviewNotes}
                </p>
              ) : null}
            </article>
          ))}

          {meta && meta.total > PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-3 pt-2 text-sm text-[var(--ink-muted)]">
              <span>
                {t('pageOf', {
                  page: meta.page,
                  totalPages,
                  total: meta.total,
                })}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('previous')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <DetailDrawer
        open={Boolean(detailId)}
        title={t('editRequests.detailTitle')}
        onClose={() => setDetailId(null)}
      >
        {detailQuery.isLoading && !activeDetail ? (
          <Skeleton className="h-40 w-full" />
        ) : activeDetail ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={statusTone(activeDetail.status)}>
                {activeDetail.status}
              </StatusBadge>
              <StatusBadge tone="default">{typeLabel(activeDetail.type)}</StatusBadge>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--ink)]">
                {activeDetail.clientName ?? t('editRequests.unknownClient')}
              </p>
              <p className="text-[var(--ink-muted)]">
                {activeDetail.znCode ?? '—'}
                {activeDetail.clientPhone ? ` · ${activeDetail.clientPhone}` : null}
              </p>
              {activeDetail.bookingId ? (
                <Link
                  to={`/clients/${activeDetail.bookingId}`}
                  className="mt-1 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  {t('editRequests.openBooking')}
                </Link>
              ) : null}
            </div>
            <div className="rounded-xl bg-[var(--bg-muted)] p-3">
              <p className="text-xs text-[var(--ink-muted)]">{t('editRequests.from')}</p>
              <p>{formatValue(activeDetail.originalValue)}</p>
              <p className="mt-2 text-xs text-[var(--ink-muted)]">{t('editRequests.to')}</p>
              <p className="font-medium">{formatValue(activeDetail.requestedValue)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                {t('editRequests.clientNote')}
              </p>
              <p className="mt-1">
                {cleanReason(activeDetail.reason) || t('editRequests.noReason')}
              </p>
            </div>
            {activeDetail.status !== 'pending' ? (
              <div className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                  {t('editRequests.reviewMeta')}
                </p>
                <p className="mt-1">
                  {activeDetail.reviewedByName
                    ? t('editRequests.reviewedBy', {
                        name: activeDetail.reviewedByName,
                        when: activeDetail.reviewedAt
                          ? formatSubmittedAt(activeDetail.reviewedAt)
                          : '—',
                      })
                    : '—'}
                </p>
                {activeDetail.reviewNotes ? (
                  <p className="mt-2 text-[var(--ink)]">{activeDetail.reviewNotes}</p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busyId === activeDetail.id}
                  onClick={() => approveMutation.mutate(activeDetail.id)}
                >
                  {t('editRequests.approve')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busyId === activeDetail.id}
                  onClick={() => {
                    setRejectId(activeDetail.id);
                    setFeedback('');
                  }}
                >
                  {t('editRequests.reject')}
                </Button>
              </div>
            )}
            <p className="text-xs text-[var(--ink-muted)]">
              {t('editRequests.hint')}
            </p>
          </div>
        ) : null}
      </DetailDrawer>

      <DialogShell
        open={Boolean(rejectId)}
        title={t('editRequests.rejectTitle')}
        onClose={() => {
          if (busyId) return;
          setRejectId(null);
          setFeedback('');
        }}
      >
        <Label>{t('editRequests.rejectLabel')}</Label>
        <Textarea
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t('editRequests.rejectPlaceholder')}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={Boolean(busyId)}
            onClick={() => {
              setRejectId(null);
              setFeedback('');
            }}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={Boolean(busyId)}
            onClick={handleReject}
          >
            {t('editRequests.rejectConfirm')}
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
