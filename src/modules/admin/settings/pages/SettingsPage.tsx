import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { settingsApi } from '../services/settings.api';
import {
  Button,
  DialogShell,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Skeleton,
  TabBar,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { ROLE_NAV_PATHS, ROLE_PERMISSIONS } from '@/modules/auth/permissions';
import type { StaffRole } from '@/shared/api/types';

const OPS_SETTINGS = [
  { key: 'vip_price', labelKey: 'vipPrice', hintKey: 'vipPriceHint' },
  { key: 'ops_whatsapp', labelKey: 'opsWhatsapp', hintKey: 'opsWhatsappHint' },
] as const;

const STAFF_ROLES: StaffRole[] = ['admin', 'ops_manager', 'support', 'driver', 'splizer'];

function settingToText(key: string, value: unknown): string {
  if (value == null || value === '') return '';
  if (key === 'vip_price') {
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object' && value !== null && 'amount' in value) {
      const amount = (value as { amount: unknown }).amount;
      if (typeof amount === 'number') return String(amount);
    }
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function parseSettingValue(key: string, raw: string): unknown {
  const trimmed = raw.trim();
  if (key === 'vip_price') {
    const amount = Number(trimmed);
    return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : trimmed;
  }
  return trimmed;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('keys');
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const listQuery = useQuery({
    queryKey: ['settings'],
    queryFn: ({ signal }) => settingsApi.list(signal),
  });

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      settingsApi.put(key, value),
    onSuccess: async () => {
      push({ tone: 'success', title: t('settingsPage.saved') });
      setEditKey(null);
      await qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const byKey = useMemo(() => {
    const map = new Map((listQuery.data ?? []).map((s) => [s.key, s]));
    return map;
  }, [listQuery.data]);

  function openKey(key: string) {
    setEditKey(key);
    setEditValue(settingToText(key, byKey.get(key)?.value));
  }

  return (
    <PageScaffold
      title={t('settingsPage.title')}
      description={t('settingsPage.description')}
      filters={
        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'keys', label: t('settingsPage.keys') },
            { id: 'rbac', label: t('settingsPage.rbac') },
          ]}
        />
      }
    >
      {tab === 'keys' ? (
        listQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : listQuery.isError ? (
          <ErrorState
            title={t('settingsPage.loadFailed')}
            onRetry={() => void listQuery.refetch()}
          />
        ) : (
          <div className="space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
            {OPS_SETTINGS.map((row) => {
              const current = byKey.get(row.key);
              return (
                <div
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{t(`settingsPage.${row.labelKey}`)}</p>
                    <p className="text-xs text-[var(--ink-muted)]">{t(`settingsPage.${row.hintKey}`)}</p>
                    {current ? (
                      <p className="mt-1 text-sm text-[var(--ink)]">
                        {settingToText(row.key, current.value)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">{t('settingsPage.notSet')}</p>
                    )}
                  </div>
                  <Button type="button" variant="secondary" onClick={() => openKey(row.key)}>
                    {current ? t('edit') : t('settingsPage.set')}
                  </Button>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          <p className="border-b border-[var(--line)] px-4 py-3 text-sm text-[var(--ink-muted)]">
            {t('settingsPage.rbacHint')}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 text-start">{t('settingsPage.feature')}</th>
                  {STAFF_ROLES.map((r) => (
                    <th key={r} className="px-3 py-3 text-center">
                      {t(`roles.${r}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(ROLE_PERMISSIONS).map(([feature, roles]) => (
                  <tr key={feature} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    {STAFF_ROLES.map((r) => (
                      <td key={r} className="px-3 py-3 text-center">
                        {(roles as readonly string[]).includes(r) ? '✓' : '✕'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--ink-muted)]">
            {STAFF_ROLES.map((r) => {
              const paths = ROLE_NAV_PATHS[r];
              return (
                <p key={r} className="mt-1">
                  <span className="font-medium">{t(`roles.${r}`)}:</span>{' '}
                  {paths === '*' ? t('settingsPage.allPaths') : paths.join(', ')}
                </p>
              );
            })}
          </div>
        </div>
      )}

      <DialogShell
        open={Boolean(editKey)}
        title={
          editKey
            ? t('settingsPage.edit', {
                key: t(`settingsPage.${OPS_SETTINGS.find((s) => s.key === editKey)?.labelKey ?? 'value'}`),
              })
            : ''
        }
        onClose={() => setEditKey(null)}
      >
        <Label>{t(editKey === 'vip_price' ? 'settingsPage.price' : 'settingsPage.phone')}</Label>
        <Input
          type={editKey === 'vip_price' ? 'number' : 'tel'}
          inputMode={editKey === 'vip_price' ? 'decimal' : 'tel'}
          min={editKey === 'vip_price' ? 0 : undefined}
          step={editKey === 'vip_price' ? '0.01' : undefined}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditKey(null)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            loading={saveMutation.isPending}
            onClick={() => {
              if (!editKey) return;
              if (editKey === 'vip_price' && !Number.isFinite(Number(editValue.trim()))) {
                push({ tone: 'error', title: t('settingsPage.invalidPrice') });
                return;
              }
              saveMutation.mutate({ key: editKey, value: parseSettingValue(editKey, editValue) });
            }}
          >
            {t('save')}
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
