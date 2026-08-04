import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { paymentsApi } from '../services/payments.api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Pagination,
  SearchBar,
  Skeleton,
  StatsCard,
  StatusBadge,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { SplizerClient } from '@/shared/api/types';
import { formatDate, formatMoney } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

export function SplizerPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [znCode, setZnCode] = useState('');
  const [lookup, setLookup] = useState<SplizerClient | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ['splizer', 'clients', { page, search: debouncedSearch }],
    queryFn: ({ signal }) =>
      paymentsApi.splizerClients({ page, limit: 20, search: debouncedSearch || undefined }, signal),
  });

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    if (!znCode.trim()) return;
    setLookingUp(true);
    setLookupError(null);
    setLookup(null);
    try {
      const result = await paymentsApi.splizerByCode(znCode.trim());
      setLookup(result);
    } catch (error) {
      setLookupError(error instanceof ApiClientError ? error.message : t('common.noData'));
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <PageScaffold
      title={t('splizer.title')}
      description={t('splizer.description')}
      stats={
        clientsQuery.data ? (
          <StatsCard label={t('bookings.total')} value={clientsQuery.data.meta.total} />
        ) : undefined
      }
      filters={
        <SearchBar
          className="max-w-xs"
          placeholder={t('splizer.searchPlaceholder')}
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      }
    >
      <Card>
        <form onSubmit={handleLookup} className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="znLookup">{t('payments.zn')}</Label>
            <Input
              id="znLookup"
              value={znCode}
              onChange={(e) => setZnCode(e.target.value)}
              placeholder="ZN0001"
            />
          </div>
          <Button type="submit" loading={lookingUp}>
            {t('splizer.collect')}
          </Button>
        </form>
        {lookupError ? <p className="mt-3 text-sm text-[var(--danger)]">{lookupError}</p> : null}
        {lookup ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] p-4">
            <div>
              <p className="font-semibold">
                {lookup.znCode} · {lookup.clientName}
              </p>
              <p className="text-sm text-[var(--ink-muted)]">{lookup.clientPhone}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <span>
                {t('bookings.total')}: {formatMoney(lookup.totalAmount)}
              </span>
              <span>
                {t('bookings.paid')}: {formatMoney(lookup.paidAmount)}
              </span>
              <span className="font-semibold">
                {t('splizer.due')}: {formatMoney(lookup.dueAmount)}
              </span>
            </div>
          </div>
        ) : null}
      </Card>

      {clientsQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : clientsQuery.isError ? (
        <ErrorState
          description={t('clients.loadFailed')}
          onRetry={() => clientsQuery.refetch()}
        />
      ) : !clientsQuery.data?.data.length ? (
        <EmptyState title={t('splizer.empty')} />
      ) : (
        <>
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3">{t('payments.zn')}</th>
                  <th className="px-4 py-3">{t('common.client')}</th>
                  <th className="px-4 py-3">{t('bookings.arrival')}</th>
                  <th className="px-4 py-3">{t('bookings.total')}</th>
                  <th className="px-4 py-3">{t('bookings.paid')}</th>
                  <th className="px-4 py-3">{t('splizer.due')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {clientsQuery.data.data.map((client) => (
                  <tr key={client.id} className="hover:bg-[var(--bg-muted)]/70">
                    <td className="px-4 py-3 font-semibold">{client.znCode}</td>
                    <td className="px-4 py-3">{client.clientName}</td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {formatDate(client.arrivalDate)}
                    </td>
                    <td className="px-4 py-3">{formatMoney(client.totalAmount)}</td>
                    <td className="px-4 py-3">{formatMoney(client.paidAmount)}</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(client.dueAmount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={client.status === 'active' ? 'success' : 'default'}>
                        {client.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              page={clientsQuery.data.meta.page}
              limit={clientsQuery.data.meta.limit}
              total={clientsQuery.data.meta.total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </PageScaffold>
  );
}
