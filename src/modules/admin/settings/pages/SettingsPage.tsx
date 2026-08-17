import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { settingsApi } from '../services/settings.api';
import {
  Button,
  DialogShell,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Skeleton,
  TabBar,
  Textarea,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { ROLE_NAV_PATHS, ROLE_PERMISSIONS } from '@/modules/auth/permissions';
import type { StaffRole } from '@/shared/api/types';

const PRESET_KEYS = [
  { key: 'vip_price', label: 'VIP price (USD)', hint: 'Stored as { "amount": number }' },
  { key: 'ops_whatsapp', label: 'Ops WhatsApp line', hint: 'E.164 number for guest handoff' },
  { key: 'stripe_publishable_key', label: 'Stripe publishable key', hint: 'pk_… — secret stays in server env' },
  { key: 'maps_key', label: 'Maps key', hint: 'Browser maps token for Ops Room' },
] as const;

const STAFF_ROLES: StaffRole[] = ['admin', 'ops_manager', 'support', 'driver', 'splizer'];

function valueToText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('keys');
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');

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
    setEditValue(valueToText(byKey.get(key)?.value));
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
            {PRESET_KEYS.map((row) => {
              const current = byKey.get(row.key);
              return (
                <div
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="font-mono text-xs text-[var(--ink-muted)]">{row.key}</p>
                    <p className="text-xs text-[var(--ink-muted)]">{row.hint}</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => openKey(row.key)}>
                    {current ? t('edit') : t('settingsPage.newSetting')}
                  </Button>
                </div>
              );
            })}
            {(listQuery.data ?? [])
              .filter((s) => !PRESET_KEYS.some((p) => p.key === s.key))
              .map((s) => (
                <div
                  key={s.key}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3 last:border-0"
                >
                  <div>
                    <p className="font-mono text-sm font-medium">{s.key}</p>
                    <p className="max-w-md truncate text-xs text-[var(--ink-muted)]">
                      {valueToText(s.value)}
                    </p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => openKey(s.key)}>
                    {t('edit')}
                  </Button>
                </div>
              ))}
            {!listQuery.data?.length ? (
              <EmptyState title={t('settingsPage.empty')} />
            ) : null}
            <div className="flex gap-2 pt-2">
              <Input
                value={newKey}
                placeholder={t('settingsPage.newSetting')}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <Button
                type="button"
                disabled={!newKey.trim()}
                onClick={() => {
                  openKey(newKey.trim());
                  setNewKey('');
                }}
              >
                {t('add')}
              </Button>
            </div>
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
        title={editKey ? t('settingsPage.edit', { key: editKey }) : ''}
        onClose={() => setEditKey(null)}
      >
        <Label>{t('settingsPage.value')}</Label>
        <Textarea rows={8} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditKey(null)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            loading={saveMutation.isPending}
            onClick={() => {
              if (!editKey) return;
              saveMutation.mutate({ key: editKey, value: parseValue(editValue) });
            }}
          >
            {t('save')}
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
