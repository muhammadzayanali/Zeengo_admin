import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { paymentsApi, type CashMethod } from '../services/payments.api';
import {
  Button,
  DialogShell,
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
  Textarea,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatDate, formatMoney } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

export function PaymentsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [cashOpen, setCashOpen] = useState(false);
  const [stripeOpen, setStripeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['payments', 'history', { page, search: debouncedSearch }],
    queryFn: ({ signal }) =>
      paymentsApi.history({ page, limit: 20, search: debouncedSearch || undefined }, signal),
  });

  const paidOnPage = useMemo(
    () => (historyQuery.data?.data ?? []).filter((p) => p.status === 'paid').length,
    [historyQuery.data],
  );

  async function handleCash(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await paymentsApi.cash({
        bookingId: String(form.get('bookingId') || ''),
        amount: Number(form.get('amount') || 0),
        method: String(form.get('method') || 'cash') as CashMethod,
        location: String(form.get('location') || '') || undefined,
        notes: String(form.get('notes') || '') || undefined,
      });
      push({ tone: 'success', title: t('payments.cashSuccess') });
      setCashOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStripe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const payment = await paymentsApi.stripeLink({
        bookingId: String(form.get('bookingId') || ''),
        amount: Number(form.get('amount') || 0),
        expiresInHours: Number(form.get('expiresInHours') || 48),
      });
      push({
        tone: 'success',
        title: t('payments.stripeSuccess'),
        description: payment.stripeLinkUrl ?? undefined,
      });
      setStripeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageScaffold
      title={t('payments.title')}
      description={t('payments.description')}
      primaryAction={
        <>
          <Button variant="secondary" onClick={() => setCashOpen(true)}>
            {t('payments.recordCash')}
          </Button>
          <Button onClick={() => setStripeOpen(true)}>{t('payments.createStripe')}</Button>
        </>
      }
      stats={
        historyQuery.data ? (
          <>
            <StatsCard label={t('bookings.total')} value={historyQuery.data.meta.total} />
            <StatsCard label={t('bookings.paid')} value={paidOnPage} tone="success" />
          </>
        ) : undefined
      }
      filters={
        <SearchBar
          className="max-w-xs"
          placeholder={t('payments.searchPlaceholder')}
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      }
    >
      {historyQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : historyQuery.isError ? (
        <ErrorState
          description={t('payments.loadFailed')}
          onRetry={() => historyQuery.refetch()}
        />
      ) : !historyQuery.data?.data.length ? (
        <EmptyState title={t('payments.empty')} />
      ) : (
        <>
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3">{t('payments.zn')}</th>
                  <th className="px-4 py-3">{t('payments.client')}</th>
                  <th className="px-4 py-3">{t('common.amount')}</th>
                  <th className="px-4 py-3">{t('payments.method')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                  <th className="px-4 py-3">{t('common.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {historyQuery.data.data.map((payment) => (
                  <tr key={payment.id} className="hover:bg-[var(--bg-muted)]/70">
                    <td className="px-4 py-3 font-semibold">{payment.znCode}</td>
                    <td className="px-4 py-3">{payment.clientName}</td>
                    <td className="px-4 py-3">{formatMoney(payment.amount)}</td>
                    <td className="px-4 py-3">{payment.method}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={payment.status === 'paid' ? 'success' : 'default'}>
                        {payment.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {formatDate(payment.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              page={historyQuery.data.meta.page}
              limit={historyQuery.data.meta.limit}
              total={historyQuery.data.meta.total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <DialogShell
        open={cashOpen}
        title={t('payments.cashTitle')}
        onClose={() => setCashOpen(false)}
      >
        <form onSubmit={handleCash} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="cashBookingId">{t('payments.bookingId')}</Label>
            <Input id="cashBookingId" name="bookingId" required />
          </div>
          <div>
            <Label htmlFor="cashAmount">{t('common.amount')}</Label>
            <Input id="cashAmount" name="amount" type="number" min={0} step="0.01" required />
          </div>
          <div>
            <Label htmlFor="cashMethod">{t('payments.method')}</Label>
            <Select id="cashMethod" name="method" defaultValue="cash">
              <option value="cash">{t('payments.cash')}</option>
              <option value="rajhi_transfer">Rajhi transfer</option>
              <option value="usdt_trc20">USDT (TRC20)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="cashLocation">{t('payments.location')}</Label>
            <Input id="cashLocation" name="location" />
          </div>
          <div>
            <Label htmlFor="cashNotes">{t('common.notes')}</Label>
            <Textarea id="cashNotes" name="notes" rows={2} />
          </div>
          {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCashOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('payments.recordCash')}
            </Button>
          </div>
        </form>
      </DialogShell>

      <DialogShell
        open={stripeOpen}
        title={t('payments.stripeTitle')}
        onClose={() => setStripeOpen(false)}
      >
        <form onSubmit={handleStripe} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="stripeBookingId">{t('payments.bookingId')}</Label>
            <Input id="stripeBookingId" name="bookingId" required />
          </div>
          <div>
            <Label htmlFor="stripeAmount">{t('common.amount')}</Label>
            <Input id="stripeAmount" name="amount" type="number" min={0} step="0.01" required />
          </div>
          <div>
            <Label htmlFor="stripeExpiry">{t('payments.when')}</Label>
            <Input id="stripeExpiry" name="expiresInHours" type="number" min={1} defaultValue={48} />
          </div>
          {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setStripeOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('payments.createLink')}
            </Button>
          </div>
        </form>
      </DialogShell>
    </PageScaffold>
  );
}
