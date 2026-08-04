import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { packagesApi } from '../services/packages.api';
import {
  Button,
  Card,
  DialogShell,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Skeleton,
  StatsCard,
  Textarea,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { Package } from '@/shared/api/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { formatMoney } from '@/shared/lib/cn';

export function PackagesPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const packagesQuery = useQuery({
    queryKey: ['packages'],
    queryFn: ({ signal }) => packagesApi.list(signal),
  });

  function parseForm(form: FormData) {
    return {
      name: String(form.get('name') || ''),
      pricePerPerson: Number(form.get('pricePerPerson') || 0),
      minPersons: Number(form.get('minPersons') || 1),
      durationDays: Number(form.get('durationDays') || 0) || undefined,
      description: String(form.get('description') || '') || undefined,
      inclusions: String(form.get('inclusions') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await packagesApi.create(parseForm(new FormData(e.currentTarget)));
      push({ tone: 'success', title: t('packages.created') });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['packages'] });
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
    setSubmitting(true);
    try {
      await packagesApi.update(editing.id, parseForm(new FormData(e.currentTarget)));
      push({ tone: 'success', title: t('saveChanges') });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await packagesApi.remove(id);
      push({ tone: 'success', title: t('packages.removed') });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
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
      title={t('packages.title')}
      description={t('packages.description')}
      primaryAction={
        isAdmin ? (
          <Button onClick={() => setCreateOpen(true)}>{t('packages.newPackage')}</Button>
        ) : undefined
      }
      stats={
        packagesQuery.data ? (
          <StatsCard label={t('bookings.total')} value={packagesQuery.data.length} />
        ) : undefined
      }
    >
      {packagesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : packagesQuery.isError ? (
        <ErrorState
          description={t('packages.loadFailed')}
          onRetry={() => packagesQuery.refetch()}
        />
      ) : !packagesQuery.data?.length ? (
        <EmptyState title={t('packages.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packagesQuery.data.map((pkg) => (
            <Card key={pkg.id}>
              <h3 className="text-lg font-bold">{pkg.name}</h3>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {formatMoney(pkg.pricePerPerson)} · {pkg.durationDays ?? '—'}
              </p>
              {pkg.description ? (
                <p className="mt-2 text-sm text-[var(--ink-muted)]">{pkg.description}</p>
              ) : null}
              {pkg.inclusions?.length ? (
                <ul className="mt-2 list-inside list-disc text-sm">
                  {pkg.inclusions.map((inc) => (
                    <li key={inc}>{inc}</li>
                  ))}
                </ul>
              ) : null}
              {isAdmin ? (
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(pkg)}>
                    {t('edit')}
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(pkg.id)}>
                    {t('delete')}
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <DialogShell
        open={createOpen}
        title={t('packages.newPackage')}
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="pkgName">{t('common.name')}</Label>
            <Input id="pkgName" name="name" required />
          </div>
          <div>
            <Label htmlFor="pkgPrice">{t('packages.pricePerPerson')}</Label>
            <Input id="pkgPrice" name="pricePerPerson" type="number" min={0} step="0.01" required />
          </div>
          <div>
            <Label htmlFor="pkgMinPersons">{t('packages.minPersons')}</Label>
            <Input id="pkgMinPersons" name="minPersons" type="number" min={1} defaultValue={1} />
          </div>
          <div>
            <Label htmlFor="pkgDuration">{t('packages.durationDays')}</Label>
            <Input id="pkgDuration" name="durationDays" type="number" min={1} />
          </div>
          <div>
            <Label htmlFor="pkgDescription">{t('packages.descriptionLabel')}</Label>
            <Textarea id="pkgDescription" name="description" rows={3} />
          </div>
          <div>
            <Label htmlFor="pkgInclusions">{t('packages.inclusions')}</Label>
            <Input id="pkgInclusions" name="inclusions" />
          </div>
          {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('packages.createPackage')}
            </Button>
          </div>
        </form>
      </DialogShell>

      <DialogShell
        open={Boolean(editing)}
        title={t('packages.editPackage')}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <form onSubmit={handleUpdate} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="editPkgName">{t('common.name')}</Label>
              <Input id="editPkgName" name="name" defaultValue={editing.name} required />
            </div>
            <div>
              <Label htmlFor="editPkgPrice">{t('packages.pricePerPerson')}</Label>
              <Input
                id="editPkgPrice"
                name="pricePerPerson"
                type="number"
                min={0}
                step="0.01"
                defaultValue={editing.pricePerPerson}
                required
              />
            </div>
            <div>
              <Label htmlFor="editPkgMinPersons">{t('packages.minPersons')}</Label>
              <Input
                id="editPkgMinPersons"
                name="minPersons"
                type="number"
                min={1}
                defaultValue={editing.minPersons}
              />
            </div>
            <div>
              <Label htmlFor="editPkgDuration">{t('packages.durationDays')}</Label>
              <Input
                id="editPkgDuration"
                name="durationDays"
                type="number"
                min={1}
                defaultValue={editing.durationDays}
              />
            </div>
            <div>
              <Label htmlFor="editPkgDescription">{t('packages.descriptionLabel')}</Label>
              <Textarea
                id="editPkgDescription"
                name="description"
                rows={3}
                defaultValue={editing.description ?? ''}
              />
            </div>
            <div>
              <Label htmlFor="editPkgInclusions">{t('packages.inclusions')}</Label>
              <Input
                id="editPkgInclusions"
                name="inclusions"
                defaultValue={editing.inclusions?.join(', ') ?? ''}
              />
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
