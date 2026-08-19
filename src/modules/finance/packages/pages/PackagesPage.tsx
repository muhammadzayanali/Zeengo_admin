import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { packagesApi, type PackageInput } from '../services/packages.api';
import {
  Button,
  DialogShell,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Skeleton,
  StatusBadge,
  Textarea,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatMoney } from '@/shared/lib/cn';
import type { Package } from '@/shared/api/types';

type PackageForm = {
  id?: string;
  name: string;
  slug: string;
  pricePerPerson: string;
  minPersons: string;
  durationDays: string;
  description: string;
};

const emptyForm = (): PackageForm => ({
  name: '',
  slug: '',
  pricePerPerson: '',
  minPersons: '',
  durationDays: '',
  description: '',
});

export function PackagesPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [inclusionsText, setInclusionsText] = useState('');

  const listQuery = useQuery({
    queryKey: ['packages'],
    queryFn: ({ signal }) => packagesApi.list(signal),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: PackageInput = {
        name: form.name.trim(),
        slug: form.slug?.trim() || undefined,
        pricePerPerson: Number(form.pricePerPerson),
        minPersons: Number(form.minPersons) || 1,
        durationDays: form.durationDays ? Number(form.durationDays) : undefined,
        description: form.description?.trim() || undefined,
        inclusions: inclusionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      return form.id
        ? packagesApi.update(form.id, payload)
        : packagesApi.create(payload);
    },
    onSuccess: async () => {
      push({ tone: 'success', title: form.id ? t('packages.updated') : t('packages.created') });
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => packagesApi.remove(id),
    onSuccess: async () => {
      push({ tone: 'success', title: t('packages.removed') });
      await qc.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  function openCreate() {
    setForm(emptyForm());
    setInclusionsText('');
    setOpen(true);
  }

  function openEdit(pkg: Package) {
    setForm({
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      pricePerPerson: String(pkg.pricePerPerson ?? ''),
      minPersons: String(pkg.minPersons ?? ''),
      durationDays: pkg.durationDays != null ? String(pkg.durationDays) : '',
      description: pkg.description ?? '',
    });
    setInclusionsText(pkg.inclusions.join(', '));
    setOpen(true);
  }

  const packages = listQuery.data ?? [];

  return (
    <PageScaffold
      title={t('packages.title')}
      description={t('packages.description')}
      primaryAction={
        <Button type="button" onClick={openCreate}>
          {t('packages.newPackage')}
        </Button>
      }
    >
      {listQuery.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : listQuery.isError ? (
        <ErrorState title={t('packages.loadFailed')} onRetry={() => void listQuery.refetch()} />
      ) : packages.length === 0 ? (
        <EmptyState title={t('packages.empty')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => (
            <article
              key={pkg.id}
              className="flex flex-col rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{pkg.name}</h3>
                <StatusBadge tone={pkg.isActive ? 'success' : 'default'}>
                  {pkg.isActive ? t('common.active') : t('common.inactive')}
                </StatusBadge>
              </div>
              <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">
                {formatMoney(pkg.pricePerPerson)}
                <span className="ms-2 text-sm font-normal text-[var(--ink-muted)]">
                  / {t('packages.person')}
                </span>
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">{pkg.slug}</p>
              {pkg.description ? (
                <p className="mt-2 text-sm text-[var(--ink-muted)]">{pkg.description}</p>
              ) : null}
              <ul className="mt-3 flex-1 space-y-1 text-sm text-[var(--ink-muted)]">
                {pkg.inclusions.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-[var(--ink-muted)]">
                {t('packages.minPersons')}: {pkg.minPersons}
                {pkg.durationDays ? ` · ${pkg.durationDays}d` : ''}
              </p>
              <div className="mt-4 flex gap-2">
                <Button type="button" variant="secondary" onClick={() => openEdit(pkg)}>
                  {t('edit')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => removeMutation.mutate(pkg.id)}
                  loading={removeMutation.isPending}
                >
                  {t('packages.remove')}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <DialogShell
        open={open}
        title={form.id ? t('packages.editPackage') : t('packages.createPackage')}
        onClose={() => setOpen(false)}
        wide
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t('common.name')}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>{t('packages.slug')}</Label>
            <Input
              value={form.slug ?? ''}
              placeholder={t('packages.autoSlug')}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
          <div>
            <Label>{t('packages.pricePerPerson')}</Label>
            <Input
              type="number"
              min={0}
              inputMode="decimal"
              value={form.pricePerPerson}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setForm({ ...form, pricePerPerson: e.target.value })}
            />
          </div>
          <div>
            <Label>{t('packages.minPersons')}</Label>
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              value={form.minPersons}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setForm({ ...form, minPersons: e.target.value })}
            />
          </div>
          <div>
            <Label>{t('packages.durationDays')}</Label>
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              value={form.durationDays}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t('packages.descriptionLabel')}</Label>
            <Textarea
              rows={2}
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t('packages.inclusions')}</Label>
            <Textarea
              rows={3}
              value={inclusionsText}
              onChange={(e) => setInclusionsText(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={!form.name.trim() || !form.pricePerPerson}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {t('save')}
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
