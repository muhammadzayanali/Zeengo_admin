import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { clientsApi } from '../services/clients.api';
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
  Skeleton,
  StatsCard,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { Client } from '@/shared/api/types';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

export function ClientsPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [search, setSearch] = useState(() => params.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const q = params.get('search') ?? '';
    setSearch(q);
    setPage(1);
  }, [params]);

  const clientsQuery = useQuery({
    queryKey: ['clients', { page, search: debouncedSearch }],
    queryFn: ({ signal }) =>
      clientsApi.list({ page, limit: 20, search: debouncedSearch || undefined }, signal),
  });

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await clientsApi.update(editing.id, {
        fullName: String(form.get('fullName') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || '') || null,
        nationality: String(form.get('nationality') || '') || null,
        whatsapp: String(form.get('whatsapp') || '') || null,
      });
      push({ tone: 'success', title: t('clients.updated') });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('clients.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageScaffold
      title={t('clients.title')}
      description={t('clients.description')}
      stats={
        clientsQuery.data ? (
          <StatsCard label={t('bookings.total')} value={clientsQuery.data.meta.total} />
        ) : undefined
      }
      filters={
        <SearchBar
          className="max-w-xs"
          placeholder={t('clients.searchPlaceholder')}
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      }
    >
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
        <EmptyState title={t('clients.empty')} />
      ) : (
        <>
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3">{t('common.name')}</th>
                  <th className="px-4 py-3">{t('common.phone')}</th>
                  <th className="px-4 py-3">{t('common.email')}</th>
                  <th className="px-4 py-3">{t('bookings.nationality')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {clientsQuery.data.data.map((client) => (
                  <tr key={client.id} className="hover:bg-[var(--bg-muted)]/70">
                    <td className="px-4 py-3 font-semibold">{client.fullName}</td>
                    <td className="px-4 py-3">{client.phone}</td>
                    <td className="px-4 py-3">{client.email ?? '—'}</td>
                    <td className="px-4 py-3">{client.nationality ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="secondary" onClick={() => setEditing(client)}>
                        {t('edit')}
                      </Button>
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

      <DialogShell
        open={Boolean(editing)}
        title={t('clients.editClient')}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="fullName">{t('clients.fullName')}</Label>
              <Input id="fullName" name="fullName" defaultValue={editing.fullName} required />
            </div>
            <div>
              <Label htmlFor="phone">{t('common.phone')}</Label>
              <Input id="phone" name="phone" defaultValue={editing.phone} required />
            </div>
            <div>
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input id="email" name="email" type="email" defaultValue={editing.email ?? ''} />
            </div>
            <div>
              <Label htmlFor="nationality">{t('bookings.nationality')}</Label>
              <Input id="nationality" name="nationality" defaultValue={editing.nationality ?? ''} />
            </div>
            <div>
              <Label htmlFor="whatsapp">{t('clients.whatsapp')}</Label>
              <Input id="whatsapp" name="whatsapp" defaultValue={editing.whatsapp ?? ''} />
            </div>
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
    </PageScaffold>
  );
}
