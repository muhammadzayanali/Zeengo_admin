import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  StatusBadge,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { StaffRole, StaffUser } from '@/shared/api/types';

const ROLES: StaffRole[] = [
  'admin',
  'ops_manager',
  'support',
  'driver',
  'splizer',
];

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: 'Admin',
  ops_manager: 'Ops Mgr',
  support: 'Support',
  driver: 'Driver',
  splizer: 'Splizer',
};

function formatLastLogin(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Today, ${d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday';
  }
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Mode = 'create' | 'edit';

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: StaffRole;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'support',
  isActive: true,
});

export function UsersPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();

  const [roleFilter, setRoleFilter] = useState<string>('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['users', 'list', roleFilter],
    queryFn: ({ signal }) =>
      usersApi.list(
        roleFilter ? (roleFilter as StaffRole) : undefined,
        signal,
      ),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const users = listQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: async () => {
      push({ tone: 'success', title: t('users.created') });
      setMode(null);
      setForm(emptyForm());
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiClientError ? err.message : t('somethingWrong'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        fullName: string;
        email: string;
        phone?: string | null;
        role: StaffRole;
        isActive: boolean;
      };
    }) => usersApi.update(id, data),
    onSuccess: async () => {
      push({ tone: 'success', title: t('users.updated') });
      setMode(null);
      setEditId(null);
      setForm(emptyForm());
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiClientError ? err.message : t('somethingWrong'),
      );
    },
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.resetPassword(id, password),
    onSuccess: () => {
      push({ tone: 'success', title: t('users.passwordReset') });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiClientError ? err.message : t('somethingWrong'),
      );
    },
  });

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    resetPwMutation.isPending;

  function openCreate() {
    setMode('create');
    setEditId(null);
    setForm(emptyForm());
    setFormError(null);
  }

  function openEdit(u: StaffUser) {
    setMode('edit');
    setEditId(u.id);
    setForm({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone ?? '',
      password: '',
      role: u.role,
      isActive: u.isActive,
    });
    setFormError(null);
  }

  function closeDialog() {
    if (busy) return;
    setMode(null);
    setEditId(null);
    setForm(emptyForm());
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.fullName.trim() || !form.email.trim()) {
      setFormError(t('users.requiredFields'));
      return;
    }

    if (mode === 'create') {
      if (form.password.length < 8) {
        setFormError(t('users.passwordMin'));
        return;
      }
      createMutation.mutate({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
        isActive: form.isActive,
      });
      return;
    }

    if (mode === 'edit' && editId) {
      await updateMutation.mutateAsync({
        id: editId,
        data: {
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          role: form.role,
          isActive: form.isActive,
        },
      });
      if (form.password.trim()) {
        if (form.password.length < 8) {
          setFormError(t('users.passwordMin'));
          return;
        }
        resetPwMutation.mutate({ id: editId, password: form.password });
      }
    }
  }

  const title = useMemo(
    () => (mode === 'edit' ? t('users.editStaff') : t('users.addStaff')),
    [mode, t],
  );

  return (
    <PageScaffold
      title={t('users.title')}
      description={t('users.description')}
      primaryAction={
        <Button type="button" onClick={openCreate}>
          + {t('users.addStaff')}
        </Button>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Label className="sr-only">{t('users.role')}</Label>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-44"
          >
            <option value="">{t('users.allRoles')}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      {listQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : listQuery.isError ? (
        <ErrorState
          title={t('users.loadFailed')}
          description={
            listQuery.error instanceof ApiClientError
              ? listQuery.error.message
              : undefined
          }
          onRetry={() => void listQuery.refetch()}
        />
      ) : users.length === 0 ? (
        <EmptyState
          title={t('users.empty')}
          description={t('users.emptyHint')}
          action={
            <Button type="button" onClick={openCreate}>
              + {t('users.addStaff')}
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 text-start">{t('users.colName')}</th>
                  <th className="px-4 py-3 text-start">{t('users.colEmail')}</th>
                  <th className="px-4 py-3 text-start">{t('users.role')}</th>
                  <th className="px-4 py-3 text-start">{t('users.colStatus')}</th>
                  <th className="px-4 py-3 text-start">
                    {t('users.colLastLogin')}
                  </th>
                  <th className="px-4 py-3 text-end">{t('users.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-[var(--line)] hover:bg-[var(--bg-muted)]/70"
                  >
                    <td className="px-4 py-3 font-medium">{s.fullName}</td>
                    <td className="px-4 py-3">{s.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge>
                        {ROLE_LABEL[s.role] ?? s.role}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={s.isActive ? 'success' : 'default'}
                      >
                        {s.isActive ? 'active' : 'inactive'}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {formatLastLogin(s.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => openEdit(s)}
                      >
                        {t('edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DialogShell
        open={Boolean(mode)}
        title={title}
        onClose={closeDialog}
      >
        {mode ? (
          <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
            <div>
              <Label>{t('users.fullName')}</Label>
              <Input
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                required
                autoComplete="name"
              />
            </div>
            <div>
              <Label>{t('users.colEmail')}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label>{t('users.phone')}</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                autoComplete="tel"
              />
            </div>
            <div>
              <Label>
                {mode === 'create'
                  ? t('users.password')
                  : t('users.newPasswordOptional')}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                required={mode === 'create'}
                minLength={mode === 'create' ? 8 : undefined}
                autoComplete={
                  mode === 'create' ? 'new-password' : 'new-password'
                }
                placeholder={
                  mode === 'edit' ? t('users.passwordLeaveBlank') : undefined
                }
              />
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                {t('users.passwordMin')}
              </p>
            </div>
            <div>
              <Label>{t('users.role')}</Label>
              <Select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value as StaffRole,
                  }))
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t('users.colStatus')}</Label>
              <Select
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isActive: e.target.value === 'active',
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            {formError ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={closeDialog}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={busy}>
                {mode === 'create' ? t('users.create') : t('save')}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogShell>
    </PageScaffold>
  );
}
