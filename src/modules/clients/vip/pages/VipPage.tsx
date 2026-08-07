import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { vipApi, vipKeys } from '../services/vip.api';
import { editRequestsApi } from '@/modules/clients/edit-requests/services/edit-requests.api';
import {
  Button,
  DetailDrawer,
  DialogShell,
  EmptyState,
  ErrorState,
  Label,
  PageScaffold,
  Select,
  Skeleton,
  StatsCard,
  StatusBadge,
  TabBar,
  Textarea,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatDate, formatMoney } from '@/shared/lib/cn';
import type { VipClient } from '@/shared/api/types';

type VipTab = 'overview' | 'requests' | 'clients';

export function VipPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<VipTab>('clients');
  const [activateId, setActivateId] = useState('');
  const [fileId, setFileId] = useState<string | null>(null);
  const [escalateId, setEscalateId] = useState<string | null>(null);
  const [escalateNote, setEscalateNote] = useState('');

  const overviewQuery = useQuery({
    queryKey: vipKeys.overview(),
    queryFn: ({ signal }) => vipApi.overview(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const clientsQuery = useQuery({
    queryKey: vipKeys.clients(),
    queryFn: ({ signal }) => vipApi.clients(signal),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    enabled: tab === 'clients' || tab === 'overview',
  });

  const requestsQuery = useQuery({
    queryKey: vipKeys.requests(),
    queryFn: ({ signal }) => vipApi.requests(signal),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    enabled: tab === 'requests' || tab === 'overview',
  });

  const candidatesQuery = useQuery({
    queryKey: vipKeys.candidates(),
    queryFn: ({ signal }) => vipApi.candidates(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const fileQuery = useQuery({
    queryKey: vipKeys.file(fileId ?? ''),
    queryFn: ({ signal }) => vipApi.clientFile(fileId!, signal),
    enabled: Boolean(fileId),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const overview = overviewQuery.data;
  const vipPrice = overview?.vipPrice ?? 100;
  const clients = clientsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const candidates = candidatesQuery.data ?? [];

  async function refreshVip() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: vipKeys.all }),
      qc.invalidateQueries({ queryKey: ['edit-requests'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
      qc.invalidateQueries({ queryKey: ['bookings'] }),
      qc.invalidateQueries({ queryKey: ['notifications'] }),
      qc.invalidateQueries({ queryKey: ['tasks'] }),
    ]);
  }

  const activateMutation = useMutation({
    mutationFn: (bookingId: string) => vipApi.activate(bookingId),
    onSuccess: async (row) => {
      push({
        tone: 'success',
        title: t('vip.activated'),
        description: t('vip.activatedDesc', {
          zn: row.znCode,
          price: formatMoney(vipPrice),
        }),
      });
      setActivateId('');
      await refreshVip();
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      vipApi.escalate(id, note),
    onSuccess: async () => {
      push({
        tone: 'success',
        title: t('vip.escalated'),
        description: t('vip.escalatedDesc'),
      });
      setEscalateId(null);
      setEscalateNote('');
      await refreshVip();
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const approveReqMutation = useMutation({
    mutationFn: (id: string) => editRequestsApi.approve(id),
    onSuccess: async () => {
      push({ tone: 'success', title: t('vip.requestApproved') });
      await refreshVip();
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const rejectReqMutation = useMutation({
    mutationFn: (id: string) => editRequestsApi.reject(id, 'VIP upgrade declined'),
    onSuccess: async () => {
      push({ tone: 'success', title: t('vip.requestRejected') });
      await refreshVip();
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const busy =
    activateMutation.isPending ||
    escalateMutation.isPending ||
    approveReqMutation.isPending ||
    rejectReqMutation.isPending;

  return (
    <PageScaffold
      title={t('vip.title')}
      description={t('vip.description')}
      filters={
        <TabBar
          value={tab}
          onChange={(id) => setTab(id as VipTab)}
          tabs={[
            { id: 'overview', label: t('vip.tabOverview') },
            {
              id: 'requests',
              label: t('vip.tabRequests'),
              count: overview?.pendingUpgradeRequests ?? requests.length,
            },
            {
              id: 'clients',
              label: t('vip.tabClients'),
              count: overview?.totalVipBookings ?? clients.length,
            },
          ]}
        />
      }
    >
      {/* Activation engine — always visible */}
      <section className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
        <h2 className="text-sm font-semibold text-[var(--ink)]">{t('vip.activateTitle')}</h2>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">{t('vip.activateHint')}</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <Label>{t('vip.selectBooking')}</Label>
            <Select
              value={activateId}
              onChange={(e) => setActivateId(e.target.value)}
              disabled={candidatesQuery.isLoading || busy}
            >
              <option value="">{t('vip.chooseBooking')}</option>
              {candidates.map((c) => (
                <option key={c.bookingId} value={c.bookingId}>
                  {c.znCode} — {c.clientName}
                  {c.packageName ? ` · ${c.packageName}` : ''}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            disabled={!activateId || busy}
            onClick={() => activateMutation.mutate(activateId)}
          >
            {t('vip.activateBtn', { price: formatMoney(vipPrice) })}
          </Button>
        </div>
      </section>

      {tab === 'overview' ? (
        <OverviewPanel
          loading={overviewQuery.isLoading}
          error={overviewQuery.isError}
          onRetry={() => void overviewQuery.refetch()}
          overview={overview}
          loadFailed={t('vip.loadFailed')}
        />
      ) : null}

      {tab === 'requests' ? (
        <RequestsPanel
          loading={requestsQuery.isLoading}
          error={requestsQuery.isError}
          onRetry={() => void requestsQuery.refetch()}
          requests={requests}
          busy={busy}
          onApprove={(id) => approveReqMutation.mutate(id)}
          onReject={(id) => rejectReqMutation.mutate(id)}
          t={t}
        />
      ) : null}

      {tab === 'clients' ? (
        <ClientsPanel
          loading={clientsQuery.isLoading}
          error={clientsQuery.isError}
          onRetry={() => void clientsQuery.refetch()}
          clients={clients}
          busy={busy}
          onOpenFile={setFileId}
          onEscalate={(id) => {
            setEscalateId(id);
            setEscalateNote('');
          }}
          t={t}
        />
      ) : null}

      <DetailDrawer
        open={Boolean(fileId)}
        title={t('vip.conciergeFile')}
        onClose={() => setFileId(null)}
      >
        {fileQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : fileQuery.isError ? (
          <ErrorState
            title={t('vip.loadFailed')}
            onRetry={() => void fileQuery.refetch()}
          />
        ) : fileQuery.data ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold">{fileQuery.data.clientName}</p>
              <StatusBadge tone="accent">VIP</StatusBadge>
              {!fileQuery.data.isAssigned ? (
                <StatusBadge tone="danger">{t('vip.unassigned')}</StatusBadge>
              ) : null}
            </div>
            <p className="text-[var(--ink-muted)]">
              {fileQuery.data.znCode}
              {fileQuery.data.packageName ? ` · ${fileQuery.data.packageName}` : ''}
              {fileQuery.data.hotelName ? ` · ${fileQuery.data.hotelName}` : ''}
            </p>
            <div className="grid gap-2 rounded-xl bg-[var(--bg-muted)] p-3">
              <p>
                <span className="text-[var(--ink-muted)]">{t('vip.phone')}: </span>
                {fileQuery.data.clientPhone || '—'}
              </p>
              <p>
                <span className="text-[var(--ink-muted)]">{t('vip.driver')}: </span>
                {fileQuery.data.driverName || t('vip.needsAssign')}
              </p>
              <p>
                <span className="text-[var(--ink-muted)]">{t('vip.dates')}: </span>
                {fileQuery.data.arrivalDate || '—'} → {fileQuery.data.departureDate || '—'}
              </p>
              <p>
                <span className="text-[var(--ink-muted)]">{t('vip.total')}: </span>
                {formatMoney(fileQuery.data.totalAmount)}
              </p>
              <p>
                <span className="text-[var(--ink-muted)]">{t('vip.language')}: </span>
                {fileQuery.data.preferredLang || '—'}
              </p>
              <p>
                <span className="text-[var(--ink-muted)]">{t('vip.specialNotes')}: </span>
                {fileQuery.data.specialNotes || t('vip.preferencesDefault')}
              </p>
              <p>
                <span className="text-[var(--ink-muted)]">{t('vip.activatedAt')}: </span>
                {fileQuery.data.vipActivatedAt
                  ? formatDate(fileQuery.data.vipActivatedAt)
                  : '—'}
              </p>
            </div>
            {fileQuery.data.notes?.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  {t('vip.staffNotes')}
                </p>
                <ul className="space-y-2">
                  {fileQuery.data.notes.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                    >
                      <p>{n.body}</p>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {n.authorName || '—'} · {formatDate(n.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Link
              to={`/clients/${fileQuery.data.bookingId}`}
              className="inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {t('vip.openBooking')}
            </Link>
          </div>
        ) : null}
      </DetailDrawer>

      <DialogShell
        open={Boolean(escalateId)}
        title={t('vip.escalateTitle')}
        onClose={() => {
          if (escalateMutation.isPending) return;
          setEscalateId(null);
          setEscalateNote('');
        }}
      >
        <p className="mb-3 text-sm text-[var(--ink-muted)]">{t('vip.escalateHint')}</p>
        <Label>{t('vip.escalateNote')}</Label>
        <Textarea
          rows={4}
          value={escalateNote}
          onChange={(e) => setEscalateNote(e.target.value)}
          placeholder={t('vip.escalatePlaceholder')}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={escalateMutation.isPending}
            onClick={() => {
              setEscalateId(null);
              setEscalateNote('');
            }}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={escalateMutation.isPending || !escalateId}
            onClick={() =>
              escalateMutation.mutate({
                id: escalateId!,
                note: escalateNote.trim() || undefined,
              })
            }
          >
            {t('vip.escalateConfirm')}
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}

function OverviewPanel({
  loading,
  error,
  onRetry,
  overview,
  loadFailed,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  overview?: {
    totalVipBookings: number;
    pendingUpgradeRequests: number;
    vipRevenue: number;
    vipPrice: number;
    hotline: string;
    slaMinutes: number;
    inclusions: string[];
  };
  loadFailed: string;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error || !overview) {
    return <ErrorState title={loadFailed} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard label={t('vip.vipBookings')} value={overview.totalVipBookings} />
        <StatsCard
          label={t('vip.pendingUpgrades')}
          value={overview.pendingUpgradeRequests}
        />
        <StatsCard
          label={t('vip.vipRevenue')}
          value={formatMoney(overview.vipRevenue)}
        />
      </div>

      <section className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">
              {t('vip.packageTitle')}
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {t('vip.packagePrice', { price: formatMoney(overview.vipPrice) })}
            </p>
          </div>
          <div className="text-end text-sm">
            <p className="font-semibold text-[var(--accent)]">{overview.hotline}</p>
            <p className="text-xs text-[var(--ink-muted)]">
              {t('vip.sla', { minutes: overview.slaMinutes })}
            </p>
          </div>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {overview.inclusions.map((item) => (
            <li
              key={item}
              className="rounded-xl bg-[var(--bg-muted)] px-3 py-2 text-sm text-[var(--ink)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RequestsPanel({
  loading,
  error,
  onRetry,
  requests,
  busy,
  onApprove,
  onReject,
  t,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  requests: Array<{
    id: string;
    znCode?: string | null;
    clientName?: string | null;
    reason: string | null;
    createdAt: string;
  }>;
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error) {
    return <ErrorState title={t('vip.loadFailed')} onRetry={onRetry} />;
  }
  if (requests.length === 0) {
    return (
      <EmptyState title={t('vip.noRequests')} description={t('vip.noRequestsHint')} />
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <article
          key={r.id}
          className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="warning">pending</StatusBadge>
                <StatusBadge tone="accent">VIP upgrade</StatusBadge>
              </div>
              <p className="mt-2 font-semibold text-[var(--ink)]">
                {r.clientName || t('vip.unknownClient')}
                {r.znCode ? (
                  <span className="ms-2 font-mono text-sm text-[var(--ink-muted)]">
                    {r.znCode}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {r.reason?.replace(/^\[seed\]\s*/i, '') || t('vip.noReason')}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                {formatDate(r.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => onApprove(r.id)}>
                {t('vip.approveUpgrade')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => onReject(r.id)}
              >
                {t('vip.rejectUpgrade')}
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ClientsPanel({
  loading,
  error,
  onRetry,
  clients,
  busy,
  onOpenFile,
  onEscalate,
  t,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  clients: VipClient[];
  busy: boolean;
  onOpenFile: (id: string) => void;
  onEscalate: (id: string) => void;
  t: (key: string) => string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  if (error) {
    return <ErrorState title={t('vip.loadFailed')} onRetry={onRetry} />;
  }
  if (clients.length === 0) {
    return (
      <EmptyState title={t('vip.noClients')} description={t('vip.noClientsHint')} />
    );
  }

  return (
    <div className="space-y-3">
      {clients.map((c) => {
        const unassigned = c.isAssigned === false;
        return (
          <article
            key={c.bookingId}
            className={
              unassigned
                ? 'rounded-[var(--radius)] border-2 border-[var(--danger)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]'
                : 'rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]'
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--ink)]">{c.clientName}</p>
                  <StatusBadge tone="accent">VIP</StatusBadge>
                  {unassigned ? (
                    <StatusBadge tone="danger">{t('vip.unassigned')}</StatusBadge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  {c.znCode}
                  {c.packageName ? ` · ${c.packageName}` : ''}
                  {c.hotelName ? ` · ${c.hotelName}` : ''}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {t('vip.specialNotes')}:{' '}
                  {c.specialNotes || t('vip.preferencesDefault')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenFile(c.bookingId)}
                >
                  {t('vip.conciergeFile')}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy}
                  onClick={() => onEscalate(c.bookingId)}
                >
                  {t('vip.escalate')}
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
