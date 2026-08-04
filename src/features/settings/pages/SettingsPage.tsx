import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { settingsApi } from '../services/settings.api';
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
import type { Setting } from '@/shared/api/types';
import { formatDate } from '@/shared/lib/cn';

export function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [editing, setEditing] = useState<Setting | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: ({ signal }) => settingsApi.list(signal),
  });

  function stringifyValue(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  function parseValue(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  async function handleSave(e: FormEvent<HTMLFormElement>, key: string) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await settingsApi.put(key, parseValue(String(form.get('value') || '')));
      push({ tone: 'success', title: t('settingsPage.saved') });
      setEditing(null);
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageScaffold
      title={t('settingsPage.title')}
      description={t('settingsPage.description')}
      primaryAction={
        <Button onClick={() => setCreating(true)}>{t('settingsPage.newSetting')}</Button>
      }
      stats={
        settingsQuery.data ? (
          <StatsCard label={t('bookings.total')} value={settingsQuery.data.length} />
        ) : undefined
      }
    >
      {settingsQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : settingsQuery.isError ? (
        <ErrorState
          description={t('settingsPage.loadFailed')}
          onRetry={() => settingsQuery.refetch()}
        />
      ) : !settingsQuery.data?.length ? (
        <EmptyState title={t('settingsPage.empty')} />
      ) : (
        <div className="flex flex-col gap-3">
          {settingsQuery.data.map((setting) => (
            <Card key={setting.key}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{setting.key}</p>
                  <pre className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink-muted)]">
                    {stringifyValue(setting.value)}
                  </pre>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {formatDate(setting.updatedAt)}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setEditing(setting)}>
                  {t('edit')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DialogShell
        open={Boolean(editing)}
        title={t('settingsPage.edit', { key: editing?.key ?? '' })}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <form onSubmit={(e) => handleSave(e, editing.key)} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="settingValue">{t('common.notes')}</Label>
              <Textarea
                id="settingValue"
                name="value"
                rows={6}
                defaultValue={stringifyValue(editing.value)}
              />
            </div>
            {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                {t('cancel')}
              </Button>
              <Button type="submit" loading={submitting}>
                {t('save')}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogShell>

      <DialogShell
        open={creating}
        title={t('settingsPage.newSetting')}
        onClose={() => setCreating(false)}
      >
        <form
          onSubmit={(e) => {
            const form = new FormData(e.currentTarget);
            handleSave(e, String(form.get('key') || ''));
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <Label htmlFor="newSettingKey">{t('common.name')}</Label>
            <Input id="newSettingKey" name="key" required placeholder="vip_price" />
          </div>
          <div>
            <Label htmlFor="value">{t('common.notes')}</Label>
            <Textarea id="value" name="value" rows={6} />
          </div>
          {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('save')}
            </Button>
          </div>
        </form>
      </DialogShell>
    </PageScaffold>
  );
}
