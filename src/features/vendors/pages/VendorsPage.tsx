import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { vendorsApi } from '../services/vendors.api';
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
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { Vendor, VendorFinance } from '@/shared/api/types';
import { formatMoney } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

const VENDOR_TYPES = ['hotel', 'transport', 'restaurant', 'activity', 'other'];

export function VendorsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Vendor | null>(null);
  const [financeTarget, setFinanceTarget] = useState<Vendor | null>(null);
  const [financeData, setFinanceData] = useState<VendorFinance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const vendorsQuery = useQuery({
    queryKey: ['vendors', { page, search: debouncedSearch }],
    queryFn: ({ signal }) =>
      vendorsApi.list({ page, limit: 20, search: debouncedSearch || undefined }, signal),
  });

  const activeCount = useMemo(
    () => (vendorsQuery.data?.data ?? []).filter((v) => v.isActive).length,
    [vendorsQuery.data],
  );

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await vendorsApi.create({
        name: String(form.get('name') || ''),
        type: String(form.get('type') || 'other'),
        city: String(form.get('city') || '') || undefined,
        contactName: String(form.get('contactName') || '') || undefined,
        phone: String(form.get('phone') || '') || undefined,
        email: String(form.get('email') || '') || undefined,
        commissionPct: Number(form.get('commissionPct') || 0),
      });
      push({ tone: 'success', title: t('vendors.created') });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await vendorsApi.update(editing.id, {
        name: String(form.get('name') || ''),
        type: String(form.get('type') || 'other'),
        city: String(form.get('city') || '') || undefined,
        contactName: String(form.get('contactName') || '') || undefined,
        phone: String(form.get('phone') || '') || undefined,
        email: String(form.get('email') || '') || undefined,
        commissionPct: Number(form.get('commissionPct') || 0),
        isActive: form.get('isActive') === 'on',
      });
      push({ tone: 'success', title: t('vendors.created') });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await vendorsApi.remove(id);
      push({ tone: 'success', title: t('delete') });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    } catch (error) {
      push({
        tone: 'error',
        title: t('somethingWrong'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    }
  }

  async function handleAssign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!assignTarget) return;
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await vendorsApi.assign(assignTarget.id, {
        bookingId: String(form.get('bookingId') || ''),
        amount: Number(form.get('amount') || 0),
      });
      push({ tone: 'success', title: t('drivers.assigned') });
      setAssignTarget(null);
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  async function openFinance(vendor: Vendor) {
    setFinanceTarget(vendor);
    setFinanceData(null);
    try {
      const data = await vendorsApi.finance(vendor.id);
      setFinanceData(data);
    } catch (error) {
      push({
        tone: 'error',
        title: t('somethingWrong'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    }
  }

  return (
    <PageScaffold
      title={t('vendors.title')}
      description={t('vendors.description')}
      primaryAction={<Button onClick={() => setCreateOpen(true)}>{t('vendors.add')}</Button>}
      stats={
        vendorsQuery.data ? (
          <>
            <StatsCard label={t('bookings.total')} value={vendorsQuery.data.meta.total} />
            <StatsCard label={t('common.active')} value={activeCount} tone="success" />
          </>
        ) : undefined
      }
      filters={
        <SearchBar
          className="max-w-xs"
          placeholder={t('searchClients')}
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      }
    >
      {vendorsQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : vendorsQuery.isError ? (
        <ErrorState
          description={t('vendors.loadFailed')}
          onRetry={() => vendorsQuery.refetch()}
        />
      ) : !vendorsQuery.data?.data.length ? (
        <EmptyState title={t('vendors.empty')} />
      ) : (
        <>
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3">{t('common.name')}</th>
                  <th className="px-4 py-3">{t('vendors.type')}</th>
                  <th className="px-4 py-3">{t('vendors.city')}</th>
                  <th className="px-4 py-3">{t('vendors.commission')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {vendorsQuery.data.data.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-[var(--bg-muted)]/70">
                    <td className="px-4 py-3 font-semibold">{vendor.name}</td>
                    <td className="px-4 py-3 capitalize">{vendor.type}</td>
                    <td className="px-4 py-3">{vendor.city ?? '—'}</td>
                    <td className="px-4 py-3">{vendor.commissionPct ?? 0}%</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={vendor.isActive ? 'success' : 'default'}>
                        {vendor.isActive ? t('common.active') : t('vendors.inactive')}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditing(vendor)}>
                          {t('edit')}
                        </Button>
                        <Button variant="secondary" onClick={() => setAssignTarget(vendor)}>
                          {t('drivers.assign')}
                        </Button>
                        <Button variant="secondary" onClick={() => openFinance(vendor)}>
                          {t('vendors.finance')}
                        </Button>
                        <Button variant="danger" onClick={() => handleRemove(vendor.id)}>
                          {t('delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              page={vendorsQuery.data.meta.page}
              limit={vendorsQuery.data.meta.limit}
              total={vendorsQuery.data.meta.total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <DialogShell open={createOpen} title={t('vendors.add')} onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="vendorName">{t('common.name')}</Label>
            <Input id="vendorName" name="name" required />
          </div>
          <div>
            <Label htmlFor="vendorType">{t('vendors.type')}</Label>
            <Select id="vendorType" name="type" defaultValue="other">
              {VENDOR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="vendorCity">{t('vendors.city')}</Label>
            <Input id="vendorCity" name="city" />
          </div>
          <div>
            <Label htmlFor="vendorContact">{t('vendors.contact')}</Label>
            <Input id="vendorContact" name="contactName" />
          </div>
          <div>
            <Label htmlFor="vendorPhone">{t('common.phone')}</Label>
            <Input id="vendorPhone" name="phone" />
          </div>
          <div>
            <Label htmlFor="vendorEmail">{t('common.email')}</Label>
            <Input id="vendorEmail" name="email" type="email" />
          </div>
          <div>
            <Label htmlFor="vendorCommission">{t('vendors.commission')}</Label>
            <Input id="vendorCommission" name="commissionPct" type="number" min={0} max={100} />
          </div>
          {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('create')}
            </Button>
          </div>
        </form>
      </DialogShell>

      <DialogShell open={Boolean(editing)} title={t('edit')} onClose={() => setEditing(null)}>
        {editing ? (
          <form onSubmit={handleUpdate} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="editVendorName">{t('common.name')}</Label>
              <Input id="editVendorName" name="name" defaultValue={editing.name} required />
            </div>
            <div>
              <Label htmlFor="editVendorType">{t('vendors.type')}</Label>
              <Select id="editVendorType" name="type" defaultValue={editing.type}>
                {VENDOR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="editVendorCity">{t('vendors.city')}</Label>
              <Input id="editVendorCity" name="city" defaultValue={editing.city ?? ''} />
            </div>
            <div>
              <Label htmlFor="editVendorContact">{t('vendors.contact')}</Label>
              <Input
                id="editVendorContact"
                name="contactName"
                defaultValue={editing.contactName ?? ''}
              />
            </div>
            <div>
              <Label htmlFor="editVendorPhone">{t('common.phone')}</Label>
              <Input id="editVendorPhone" name="phone" defaultValue={editing.phone ?? ''} />
            </div>
            <div>
              <Label htmlFor="editVendorEmail">{t('common.email')}</Label>
              <Input id="editVendorEmail" name="email" defaultValue={editing.email ?? ''} />
            </div>
            <div>
              <Label htmlFor="editVendorCommission">{t('vendors.commission')}</Label>
              <Input
                id="editVendorCommission"
                name="commissionPct"
                type="number"
                min={0}
                max={100}
                defaultValue={editing.commissionPct ?? 0}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="isActive" defaultChecked={editing.isActive} />
              {t('common.active')}
            </label>
            {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                {t('cancel')}
              </Button>
              <Button type="submit" loading={submitting}>
                {t('saveChanges')}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogShell>

      <DialogShell
        open={Boolean(assignTarget)}
        title={t('drivers.assign')}
        onClose={() => setAssignTarget(null)}
      >
        <form onSubmit={handleAssign} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="vendorAssignBooking">{t('payments.bookingId')}</Label>
            <Input id="vendorAssignBooking" name="bookingId" required />
          </div>
          <div>
            <Label htmlFor="vendorAssignAmount">{t('common.amount')}</Label>
            <Input id="vendorAssignAmount" name="amount" type="number" min={0} step="0.01" />
          </div>
          {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setAssignTarget(null)}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('drivers.assign')}
            </Button>
          </div>
        </form>
      </DialogShell>

      <DialogShell
        open={Boolean(financeTarget)}
        title={t('vendors.finance')}
        onClose={() => setFinanceTarget(null)}
      >
        {!financeData ? (
          <Skeleton className="h-24" />
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-[var(--ink-muted)]">{t('bookings.total')}</dt>
            <dd>{financeData.totalBookings}</dd>
            <dt className="text-[var(--ink-muted)]">{t('common.amount')}</dt>
            <dd>{formatMoney(financeData.totalAmount)}</dd>
            <dt className="text-[var(--ink-muted)]">{t('vendors.commission')}</dt>
            <dd>{formatMoney(financeData.totalCommission)}</dd>
            <dt className="text-[var(--ink-muted)]">{t('common.pending')}</dt>
            <dd>{formatMoney(financeData.pendingAmount)}</dd>
            <dt className="text-[var(--ink-muted)]">{t('common.completed')}</dt>
            <dd>{formatMoney(financeData.completedAmount)}</dd>
          </dl>
        )}
      </DialogShell>
    </PageScaffold>
  );
}
