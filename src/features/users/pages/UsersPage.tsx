import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../services/users.api';
import {
  Button,
  DialogShell,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Select,
  Skeleton,
  StatsCard,
  StatusBadge,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { StaffRole, StaffUser } from '@/shared/api/types';

const ROLES: StaffRole[] = ['admin', 'ops_manager', 'splizer', 'support', 'driver'];

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [roleFilter, setRoleFilter] = useState<StaffRole | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: ({ signal }) => usersApi.list(roleFilter || undefined, signal),
  });

  const statsQuery = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: ({ signal }) => usersApi.stats(signal),
  });

  function roleLabel(role: string) {
    const key = `roles.${role}` as const;
    const translated = t(key);
    return translated === key ? role.replace('_', ' ') : translated;
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await usersApi.create({
        fullName: String(form.get('fullName') || ''),
        email: String(form.get('email') || ''),
        phone: String(form.get('phone') || '') || undefined,
        password: String(form.get('password') || ''),
        role: String(form.get('role') || 'support') as StaffRole,
      });
      push({ tone: 'success', title: t('users.created') });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
      await usersApi.update(editing.id, {
        fullName: String(form.get('fullName') || ''),
        email: String(form.get('email') || ''),
        phone: String(form.get('phone') || '') || null,
        role: String(form.get('role') || 'support') as StaffRole,
        isActive: form.get('isActive') === 'on',
      });
      push({ tone: 'success', title: t('saveChanges') });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resetTarget) return;
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await usersApi.resetPassword(resetTarget.id, String(form.get('password') || ''));
      push({ tone: 'success', title: t('users.password') });
      setResetTarget(null);
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  const roleEntries = statsQuery.data
    ? Object.entries(statsQuery.data.byRole).slice(0, 3)
    : [];

  return (
    <PageScaffold
      title={t('users.title')}
      description={t('users.description')}
      primaryAction={<Button onClick={() => setCreateOpen(true)}>{t('users.invite')}</Button>}
      stats={
        statsQuery.data ? (
          <>
            <StatsCard label={t('bookings.total')} value={statsQuery.data.total} />
            {roleEntries.map(([role, count]) => (
              <StatsCard key={role} label={roleLabel(role)} value={count} />
            ))}
          </>
        ) : undefined
      }
      filters={
        <Select
          className="max-w-xs"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as StaffRole | '')}
        >
          <option value="">{t('all')}</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </Select>
      }
    >
      {usersQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : usersQuery.isError ? (
        <ErrorState description={t('users.loadFailed')} onRetry={() => usersQuery.refetch()} />
      ) : !usersQuery.data?.length ? (
        <EmptyState title={t('users.empty')} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3">{t('common.name')}</th>
                <th className="px-4 py-3">{t('common.email')}</th>
                <th className="px-4 py-3">{t('users.role')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {usersQuery.data.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--bg-muted)]/70">
                  <td className="px-4 py-3 font-semibold">{user.fullName}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{roleLabel(user.role)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={user.isActive ? 'success' : 'default'}>
                      {user.isActive ? t('common.active') : t('vendors.inactive')}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setEditing(user)}>
                        {t('edit')}
                      </Button>
                      <Button variant="secondary" onClick={() => setResetTarget(user)}>
                        {t('users.password')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DialogShell open={createOpen} title={t('users.invite')} onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="userFullName">{t('users.fullName')}</Label>
            <Input id="userFullName" name="fullName" required />
          </div>
          <div>
            <Label htmlFor="userEmail">{t('common.email')}</Label>
            <Input id="userEmail" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="userPhone">{t('common.phone')}</Label>
            <Input id="userPhone" name="phone" />
          </div>
          <div>
            <Label htmlFor="userPassword">{t('users.password')}</Label>
            <Input id="userPassword" name="password" type="password" minLength={8} required />
          </div>
          <div>
            <Label htmlFor="userRole">{t('users.role')}</Label>
            <Select id="userRole" name="role" defaultValue="support">
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </Select>
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
              <Label htmlFor="editUserFullName">{t('users.fullName')}</Label>
              <Input id="editUserFullName" name="fullName" defaultValue={editing.fullName} required />
            </div>
            <div>
              <Label htmlFor="editUserEmail">{t('common.email')}</Label>
              <Input
                id="editUserEmail"
                name="email"
                type="email"
                defaultValue={editing.email}
                required
              />
            </div>
            <div>
              <Label htmlFor="editUserPhone">{t('common.phone')}</Label>
              <Input id="editUserPhone" name="phone" defaultValue={editing.phone ?? ''} />
            </div>
            <div>
              <Label htmlFor="editUserRole">{t('users.role')}</Label>
              <Select id="editUserRole" name="role" defaultValue={editing.role}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </Select>
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
        open={Boolean(resetTarget)}
        title={t('users.password')}
        onClose={() => setResetTarget(null)}
      >
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="resetPassword">{t('users.password')}</Label>
            <Input id="resetPassword" name="password" type="password" minLength={8} required />
          </div>
          {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>
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
