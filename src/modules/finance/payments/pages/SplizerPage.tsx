import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { paymentsApi, type CashMethod } from '../services/payments.api';
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
  TabBar,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatDate, formatMoney } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import type { SplizerClient } from '@/shared/api/types';

type Tab = 'clients' | 'cash' | 'stripe' | 'history';

export function SplizerPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('clients');
  const [q, setQ] = useState('');
  const search = useDebouncedValue(q);
  const [page, setPage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const [cashBooking, setCashBooking] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashNote, setCashNote] = useState('');
  const [cashMethod, setCashMethod] = useState<CashMethod>('cash');
  const [stripeBooking, setStripeBooking] = useState('');
  const [stripeAmount, setStripeAmount] = useState('');
  const [lastStripeUrl, setLastStripeUrl] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['payments', 'splizer', { page, search }],
    queryFn: ({ signal }) =>
      paymentsApi.splizerClients(
        { page, limit: 24, search: search || undefined },
        signal,
      ),
  });

  const historyQuery = useQuery({
    queryKey: ['payments', 'history', { page: histPage }],
    queryFn: ({ signal }) =>
      paymentsApi.history({ page: histPage, limit: 20 }, signal),
    enabled: tab === 'history',
  });

  const clients = clientsQuery.data?.data ?? [];
  const dueTotal = clients.reduce((s, c) => s + c.dueAmount, 0);
  const dueCount = clients.filter((c) => c.dueAmount > 0).length;

  const cashMutation = useMutation({
    mutationFn: () =>
      paymentsApi.cash({
        bookingId: cashBooking,
        amount: Number(cashAmount),
        method: cashMethod,
        notes: cashNote.trim() || undefined,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: t('splizer.collected') });
      setCashAmount('');
      setCashNote('');
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
        amount: Number(stripeAmount),
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

  const allForSelect = useMemo(() => clients, [clients]);

  function pickClient(c: SplizerClient, next: Tab) {
    if (next === 'cash') {
      setCashBooking(c.id);
      setCashAmount(c.dueAmount ? String(c.dueAmount) : '');
    } else {
      setStripeBooking(c.id);
      setStripeAmount(c.dueAmount ? String(c.dueAmount) : '');
    }
    setTab(next);
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
          { id: 'clients', label: t('splizer.collections'), count: clients.length },
          { id: 'cash', label: t('splizer.recordCash') },
          { id: 'stripe', label: t('splizer.stripe') },
          { id: 'history', label: t('splizer.history') },
        ]}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === 'clients' ? (
        <div className="mt-4 space-y-3">
          <SearchBar
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder={t('splizer.searchPlaceholder')}
            className="max-w-sm"
          />
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
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{c.clientName}</p>
                        <p className="text-xs text-[var(--ink-muted)]">{c.znCode}</p>
                      </div>
                      <span className="text-xs text-[var(--ink-muted)]">{c.status}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-[var(--ink-muted)]">{t('common.amount')}</dt>
                        <dd className="font-semibold">{formatMoney(c.totalAmount)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[var(--ink-muted)]">{t('splizer.paid')}</dt>
                        <dd className="font-semibold">{formatMoney(c.paidAmount)}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-[var(--ink-muted)]">{t('splizer.due')}</dt>
                        <dd className="font-semibold text-[var(--danger)]">
                          {formatMoney(c.dueAmount)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-3 !py-1.5 text-xs"
                        disabled={c.dueAmount <= 0}
                        onClick={() => pickClient(c, 'cash')}
                      >
                        {t('splizer.recordCash')}
                      </Button>
                      <Button
                        type="button"
                        className="!px-3 !py-1.5 text-xs"
                        disabled={c.dueAmount <= 0}
                        onClick={() => pickClient(c, 'stripe')}
                      >
                        {t('splizer.stripe')}
                      </Button>
                    </div>
                  </div>
                ))}
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
        <div className="mt-4 max-w-md space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <div>
            <Label>{t('common.client')}</Label>
            <Select value={cashBooking} onChange={(e) => setCashBooking(e.target.value)}>
              <option value="">{t('splizer.chooseBooking')}</option>
              {allForSelect.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.znCode} — {c.clientName} · {formatMoney(c.dueAmount)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t('splizer.method')}</Label>
            <Select
              value={cashMethod}
              onChange={(e) => setCashMethod(e.target.value as CashMethod)}
            >
              <option value="cash">Cash</option>
              <option value="rajhi_transfer">Rajhi transfer</option>
              <option value="usdt_trc20">USDT TRC20</option>
            </Select>
          </div>
          <div>
            <Label>{t('common.amount')}</Label>
            <Input
              type="number"
              min={1}
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('common.notes')}</Label>
            <Input value={cashNote} onChange={(e) => setCashNote(e.target.value)} />
          </div>
          <Button
            type="button"
            loading={cashMutation.isPending}
            disabled={!cashBooking || !cashAmount}
            onClick={() => cashMutation.mutate()}
          >
            {t('splizer.recordCash')}
          </Button>
        </div>
      ) : null}

      {tab === 'stripe' ? (
        <div className="mt-4 max-w-md space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-[var(--ink-muted)]">{t('splizer.stripeHint')}</p>
          <div>
            <Label>{t('common.client')}</Label>
            <Select value={stripeBooking} onChange={(e) => setStripeBooking(e.target.value)}>
              <option value="">{t('splizer.chooseBooking')}</option>
              {allForSelect.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.znCode} — {c.clientName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t('common.amount')}</Label>
            <Input
              type="number"
              min={1}
              value={stripeAmount}
              onChange={(e) => setStripeAmount(e.target.value)}
            />
          </div>
          <Button
            type="button"
            loading={stripeMutation.isPending}
            disabled={!stripeBooking || !stripeAmount}
            onClick={() => stripeMutation.mutate()}
          >
            {t('splizer.makeLink')}
          </Button>
          {lastStripeUrl ? (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-muted)] p-3 text-sm">
              <p className="break-all font-mono text-[var(--accent)]">{lastStripeUrl}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-2 !px-3 !py-1.5 text-xs"
                onClick={() => {
                  void navigator.clipboard.writeText(lastStripeUrl);
                  push({ tone: 'success', title: t('copied') });
                }}
              >
                {t('copy')}
              </Button>
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
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--ink-muted)]">
                    <tr>
                      <th className="px-3 py-2.5 text-start">{t('payments.when')}</th>
                      <th className="px-3 py-2.5 text-start">{t('common.client')}</th>
                      <th className="px-3 py-2.5 text-start">{t('splizer.method')}</th>
                      <th className="px-3 py-2.5 text-start">{t('common.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historyQuery.data?.data ?? []).map((p) => (
                      <tr key={p.id} className="border-t border-[var(--line)]">
                        <td className="px-3 py-2.5 text-[var(--ink-muted)]">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="px-3 py-2.5 font-medium">
                          {p.clientName}
                          <span className="block text-xs text-[var(--ink-muted)]">{p.znCode}</span>
                        </td>
                        <td className="px-3 py-2.5 capitalize">{p.method}</td>
                        <td className="px-3 py-2.5 font-semibold">{formatMoney(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
