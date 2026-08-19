import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { paymentsApi, type CashMethod, type StripeAmountMode } from '../services/payments.api';
import {
  Button,
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
  TabBar,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatMoney } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import type { PaymentHistoryItem, SplizerClient } from '@/shared/api/types';

type Tab = 'clients' | 'cash' | 'stripe' | 'history';
type BookingFilter = '' | 'active' | 'completed' | 'cancelled';

const CASH_METHODS: Array<{ id: CashMethod; labelKey: string }> = [
  { id: 'cash', labelKey: 'methodCash' },
  { id: 'rajhi_transfer', labelKey: 'methodRajhi' },
  { id: 'usdt_trc20', labelKey: 'methodTrc20' },
  { id: 'usdt_bep20', labelKey: 'methodBep20' },
];

function printReceipt(
  p: PaymentHistoryItem,
  t: (key: string, options?: Record<string, string>) => string,
) {
  const w = window.open('', '_blank', 'width=480,height=640');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${t('splizer.receipt')}</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;padding:28px;color:#111}
      h1{font-size:18px;margin:0 0 4px}
      p,td{font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      td{padding:6px 0;border-bottom:1px solid #eee}
      .muted{color:#666}
      .amt{font-size:22px;font-weight:700;margin:12px 0}
    </style></head><body>
    <h1>ZEENGO</h1>
    <p class="muted">${t('splizer.receipt')}</p>
    <div class="amt">${formatMoney(p.amount)}</div>
    <table>
      <tr><td class="muted">${t('payments.zn')}</td><td>${p.znCode}</td></tr>
      <tr><td class="muted">${t('common.client')}</td><td>${p.clientName}</td></tr>
      <tr><td class="muted">${t('splizer.method')}</td><td>${p.method}</td></tr>
      <tr><td class="muted">${t('payments.when')}</td><td>${new Date(p.createdAt).toLocaleString()}</td></tr>
      <tr><td class="muted">${t('splizer.collectedBy')}</td><td>${p.collectedByName ?? '—'}</td></tr>
      ${p.notes ? `<tr><td class="muted">${t('common.notes')}</td><td>${p.notes}</td></tr>` : ''}
    </table>
    <p class="muted" style="margin-top:24px">${p.id}</p>
    </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export function SplizerPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('clients');
  const [q, setQ] = useState('');
  const search = useDebouncedValue(q);
  const [status, setStatus] = useState<BookingFilter>('');
  const [page, setPage] = useState(1);
  const [histPage, setHistPage] = useState(1);

  const [lookupCode, setLookupCode] = useState('');
  const [loadedClient, setLoadedClient] = useState<SplizerClient | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [cashNote, setCashNote] = useState('');
  const [cashLocation, setCashLocation] = useState('');
  const [cashMethod, setCashMethod] = useState<CashMethod>('cash');

  const [stripeBooking, setStripeBooking] = useState('');
  const [stripeMode, setStripeMode] = useState<StripeAmountMode>('remaining');
  const [stripeAmount, setStripeAmount] = useState('');
  const [lastStripeUrl, setLastStripeUrl] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['payments', 'splizer', { page, search, status }],
    queryFn: ({ signal }) =>
      paymentsApi.splizerClients(
        {
          page,
          limit: 24,
          search: search || undefined,
          status: status || undefined,
        },
        signal,
      ),
  });

  const lookupListQuery = useQuery({
    queryKey: ['payments', 'splizer', 'lookup'],
    queryFn: ({ signal }) => paymentsApi.splizerClients({ page: 1, limit: 100 }, signal),
    enabled: tab === 'cash' || tab === 'stripe',
  });

  const historyQuery = useQuery({
    queryKey: ['payments', 'history', { page: histPage }],
    queryFn: ({ signal }) => paymentsApi.history({ page: histPage, limit: 20 }, signal),
    enabled: tab === 'history',
  });

  const clients = clientsQuery.data?.data ?? [];
  const lookupClients = lookupListQuery.data?.data ?? clients;
  const dueTotal = clients.reduce((s, c) => s + c.dueAmount, 0);
  const dueCount = clients.filter((c) => c.dueAmount > 0).length;

  const selectedStripe = useMemo(
    () => lookupClients.find((c) => c.id === stripeBooking) ?? null,
    [lookupClients, stripeBooking],
  );

  const cashMutation = useMutation({
    mutationFn: () =>
      paymentsApi.cash({
        bookingId: loadedClient?.id,
        amount: Number(cashAmount),
        method: cashMethod,
        notes: cashNote.trim() || undefined,
        location: cashLocation.trim() || undefined,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('splizer.collected') });
      setCashAmount('');
      setCashNote('');
      setCashLocation('');
      setLoadedClient(null);
      setLookupCode('');
      setTab('history');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['payments'] }),
        qc.invalidateQueries({ queryKey: ['bookings'] }),
      ]);
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const stripeMutation = useMutation({
    mutationFn: () =>
      paymentsApi.stripeLink({
        bookingId: stripeBooking,
        amountMode: stripeMode,
        amount: stripeMode === 'custom' ? Number(stripeAmount) : undefined,
      }),
    onSuccess: async (row) => {
      const url = row.stripeLinkUrl ?? row.url ?? null;
      setLastStripeUrl(url);
      push({
        tone: 'success',
        title: url ? t('payments.stripeSuccess') : t('splizer.linkReady'),
      });
      await qc.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  async function loadByCode(code = lookupCode) {
    const zn = code.trim();
    if (!zn) return;
    try {
      const client = await paymentsApi.splizerByCode(zn);
      setLoadedClient(client);
      setLookupCode(client.znCode);
      setCashAmount(client.dueAmount ? String(client.dueAmount) : '');
    } catch (err) {
      setLoadedClient(null);
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('splizer.notFound'),
      });
    }
  }

  function pickClient(c: SplizerClient, next: Tab) {
    if (next === 'cash') {
      setLookupCode(c.znCode);
      setLoadedClient(c);
      setCashAmount(c.dueAmount ? String(c.dueAmount) : '');
    } else {
      setStripeBooking(c.id);
      setStripeMode('remaining');
      setStripeAmount(c.dueAmount ? String(c.dueAmount) : '');
      setLastStripeUrl(null);
    }
    setTab(next);
  }

  function methodLabel(method: string) {
    if (method === 'cash') return t('splizer.methodCash');
    if (method === 'rajhi_transfer') return t('splizer.methodRajhi');
    if (method === 'usdt_trc20') return t('splizer.methodTrc20');
    if (method === 'usdt_bep20') return t('splizer.methodBep20');
    if (method === 'stripe') return t('splizer.stripe');
    return method;
  }

  return (
    <PageScaffold
      title={t('splizer.title')}
      description={t('splizer.description')}
      stats={
        <>
          <StatsCard label={t('splizer.withDue')} value={dueCount} tone="warning" />
          <StatsCard label={t('splizer.due')} value={formatMoney(dueTotal)} tone="danger" />
          <StatsCard
            label={t('splizer.onPage')}
            value={clientsQuery.data?.meta.total ?? 0}
            tone="accent"
          />
        </>
      }
    >
      <TabBar
        tabs={[
          { id: 'clients', label: t('splizer.tabClients'), count: clientsQuery.data?.meta.total },
          { id: 'cash', label: t('splizer.tabCash') },
          { id: 'stripe', label: t('splizer.tabStripe') },
          { id: 'history', label: t('splizer.tabHistory') },
        ]}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === 'clients' ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <SearchBar
              value={q}
              onChange={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder={t('splizer.searchPlaceholder')}
              className="max-w-sm flex-1"
            />
            <Select
              className="max-w-[180px]"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as BookingFilter);
                setPage(1);
              }}
            >
              <option value="">{t('splizer.allStatus')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="completed">{t('common.completed')}</option>
              <option value="cancelled">{t('common.cancelled')}</option>
            </Select>
          </div>
          {clientsQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : clientsQuery.isError ? (
            <ErrorState
              title={t('splizer.loadFailed')}
              onRetry={() => void clientsQuery.refetch()}
            />
          ) : clients.length === 0 ? (
            <EmptyState title={t('splizer.empty')} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {clients.map((c) => {
                  const paidOff = c.dueAmount <= 0;
                  return (
                    <div
                      key={c.id}
                      className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{c.clientName}</p>
                          <p className="text-xs text-[var(--ink-muted)]">
                            {c.znCode}
                            {c.partySize ? ` · ${c.partySize} ${t('splizer.pax')}` : ''}
                            {c.packageName ? ` ${c.packageName}` : ''}
                          </p>
                        </div>
                        <StatusBadge
                          tone={
                            c.status === 'active'
                              ? 'success'
                              : c.status === 'cancelled'
                                ? 'danger'
                                : 'default'
                          }
                        >
                          {t(`common.${c.status}`, { defaultValue: c.status })}
                        </StatusBadge>
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <dt className="text-xs text-[var(--ink-muted)]">{t('common.amount')}</dt>
                          <dd className="font-semibold">{formatMoney(c.totalAmount)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[var(--ink-muted)]">{t('splizer.paid')}</dt>
                          <dd className="font-semibold">{formatMoney(c.paidAmount)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[var(--ink-muted)]">{t('splizer.due')}</dt>
                          <dd
                            className={
                              paidOff
                                ? 'font-semibold text-[var(--success)]'
                                : 'font-semibold text-[var(--danger)]'
                            }
                          >
                            {paidOff ? t('splizer.fullyPaid') : formatMoney(c.dueAmount)}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-3 !py-1.5 text-xs"
                          disabled={paidOff}
                          onClick={() => pickClient(c, 'cash')}
                        >
                          {t('splizer.tabCash')}
                        </Button>
                        <Button
                          type="button"
                          className="!px-3 !py-1.5 text-xs"
                          disabled={paidOff}
                          onClick={() => pickClient(c, 'stripe')}
                        >
                          {t('splizer.tabStripe')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination
                page={clientsQuery.data?.meta.page ?? page}
                limit={clientsQuery.data?.meta.limit ?? 24}
                total={clientsQuery.data?.meta.total ?? 0}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      ) : null}

      {tab === 'cash' ? (
        <div className="mt-4 max-w-lg space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <div>
            <Label>{t('splizer.lookup')}</Label>
            <div className="flex gap-2">
              <Input
                value={lookupCode}
                placeholder="ZN0003"
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadByCode();
                }}
              />
              <Button type="button" variant="secondary" onClick={() => void loadByCode()}>
                {t('splizer.load')}
              </Button>
            </div>
          </div>
          <div>
            <Label>{t('splizer.orSelect')}</Label>
            <Select
              value={loadedClient?.id ?? ''}
              onChange={(e) => {
                const c = lookupClients.find((x) => x.id === e.target.value);
                if (c) pickClient(c, 'cash');
              }}
            >
              <option value="">{t('splizer.chooseBooking')}</option>
              {lookupClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.znCode} — {c.clientName} · {formatMoney(c.dueAmount)}
                </option>
              ))}
            </Select>
          </div>

          {loadedClient ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-muted)] p-3 text-sm">
              <p className="font-semibold">{loadedClient.clientName}</p>
              <p className="text-xs text-[var(--ink-muted)]">
                {loadedClient.znCode}
                {loadedClient.packageName ? ` · ${loadedClient.packageName}` : ''}
              </p>
              <p className="mt-2">
                {t('splizer.due')}:{' '}
                <span className="font-semibold text-[var(--danger)]">
                  {formatMoney(loadedClient.dueAmount)}
                </span>
              </p>
            </div>
          ) : null}

          <div>
            <Label>{t('splizer.method')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {CASH_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCashMethod(m.id)}
                  className={
                    cashMethod === m.id
                      ? 'rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-start text-sm font-medium'
                      : 'rounded-xl border border-[var(--line)] px-3 py-2 text-start text-sm'
                  }
                >
                  {t(`splizer.${m.labelKey}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>{t('common.amount')}</Label>
              <button
                type="button"
                className="text-xs font-medium text-[var(--accent)]"
                disabled={!loadedClient?.dueAmount}
                onClick={() => setCashAmount(String(loadedClient?.dueAmount ?? ''))}
              >
                {t('splizer.fillPending')}
              </button>
            </div>
            <Input
              type="number"
              min={1}
              step="0.01"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('splizer.location')}</Label>
            <Input value={cashLocation} onChange={(e) => setCashLocation(e.target.value)} />
          </div>
          <div>
            <Label>{t('common.notes')}</Label>
            <Input value={cashNote} onChange={(e) => setCashNote(e.target.value)} />
          </div>
          <Button
            type="button"
            loading={cashMutation.isPending}
            disabled={!loadedClient || !cashAmount || loadedClient.dueAmount <= 0}
            onClick={() => cashMutation.mutate()}
          >
            {t('splizer.recordCollection')}
          </Button>
        </div>
      ) : null}

      {tab === 'stripe' ? (
        <div className="mt-4 max-w-lg space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-[var(--ink-muted)]">{t('splizer.stripeHint')}</p>
          <div>
            <Label>{t('common.client')}</Label>
            <Select
              value={stripeBooking}
              onChange={(e) => {
                setStripeBooking(e.target.value);
                const c = lookupClients.find((x) => x.id === e.target.value);
                if (c) setStripeAmount(c.dueAmount ? String(c.dueAmount) : '');
                setLastStripeUrl(null);
              }}
            >
              <option value="">{t('splizer.chooseBooking')}</option>
              {lookupClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.znCode} — {c.clientName} · {formatMoney(c.dueAmount)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t('splizer.chargeType')}</Label>
            <Select
              value={stripeMode}
              onChange={(e) => setStripeMode(e.target.value as StripeAmountMode)}
            >
              <option value="deposit">{t('splizer.depositOnly')}</option>
              <option value="remaining">{t('splizer.fullRemaining')}</option>
              <option value="custom">{t('splizer.customAmount')}</option>
            </Select>
          </div>
          {stripeMode === 'custom' ? (
            <div>
              <Label>{t('common.amount')}</Label>
              <Input
                type="number"
                min={1}
                step="0.01"
                value={stripeAmount}
                onChange={(e) => setStripeAmount(e.target.value)}
              />
            </div>
          ) : selectedStripe ? (
            <p className="text-sm text-[var(--ink-muted)]">
              {stripeMode === 'deposit'
                ? t('splizer.depositHint', {
                    amount: formatMoney(Math.min(selectedStripe.dueAmount, Math.max(1, Math.round(selectedStripe.totalAmount * 0.3 * 100) / 100))),
                  })
                : t('splizer.remainingHint', { amount: formatMoney(selectedStripe.dueAmount) })}
            </p>
          ) : null}
          <Button
            type="button"
            loading={stripeMutation.isPending}
            disabled={!stripeBooking || (stripeMode === 'custom' && !stripeAmount)}
            onClick={() => stripeMutation.mutate()}
          >
            {t('splizer.makeLink')}
          </Button>
          {lastStripeUrl ? (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-muted)] p-3 text-sm">
              <p className="break-all font-mono text-[var(--accent)]">{lastStripeUrl}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(lastStripeUrl);
                    push({ tone: 'success', title: t('copied') });
                  }}
                >
                  {t('copy')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(lastStripeUrl)}`,
                      '_blank',
                    );
                  }}
                >
                  {t('splizer.sendWhatsapp')}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'history' ? (
        <div className="mt-4 overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          {historyQuery.isLoading ? (
            <div className="p-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : historyQuery.isError ? (
            <div className="p-4">
              <ErrorState
                title={t('payments.loadFailed')}
                onRetry={() => void historyQuery.refetch()}
              />
            </div>
          ) : (historyQuery.data?.data ?? []).length === 0 ? (
            <div className="p-6">
              <EmptyState title={t('splizer.historyEmpty')} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--ink-muted)]">
                    <tr>
                      <th className="px-3 py-2.5 text-start">{t('payments.when')}</th>
                      <th className="px-3 py-2.5 text-start">{t('common.client')}</th>
                      <th className="px-3 py-2.5 text-start">{t('splizer.method')}</th>
                      <th className="px-3 py-2.5 text-start">{t('splizer.collectedBy')}</th>
                      <th className="px-3 py-2.5 text-start">{t('common.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historyQuery.data?.data ?? []).map((p) => (
                      <tr
                        key={p.id}
                        className="cursor-pointer border-t border-[var(--line)] hover:bg-[var(--bg-muted)]"
                        onClick={() => printReceipt(p, t)}
                      >
                        <td className="px-3 py-2.5 text-[var(--ink-muted)]">
                          {new Date(p.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 font-medium">
                          {p.clientName}
                          <span className="block text-xs text-[var(--ink-muted)]">{p.znCode}</span>
                        </td>
                        <td className="px-3 py-2.5">{methodLabel(p.method)}</td>
                        <td className="px-3 py-2.5 text-[var(--ink-muted)]">
                          {p.collectedByName ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold">{formatMoney(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--ink-muted)]">
                {t('splizer.receiptHint')}
              </p>
              <div className="border-t border-[var(--line)] px-4 py-3">
                <Pagination
                  page={historyQuery.data?.meta.page ?? histPage}
                  limit={historyQuery.data?.meta.limit ?? 20}
                  total={historyQuery.data?.meta.total ?? 0}
                  onPageChange={setHistPage}
                />
              </div>
            </>
          )}
        </div>
      ) : null}
    </PageScaffold>
  );
}
