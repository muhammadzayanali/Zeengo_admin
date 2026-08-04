import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tasksApi } from '../services/tasks.api';
import {
  Button,
  Card,
  DialogShell,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Pagination,
  Select,
  Skeleton,
  StatsCard,
  StatusBadge,
  Textarea,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatDate } from '@/shared/lib/cn';

export function TasksPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tasksQuery = useQuery({
    queryKey: ['tasks', { page, status, priority }],
    queryFn: ({ signal }) =>
      tasksApi.list(
        { page, limit: 20, status: status || undefined, priority: priority || undefined },
        signal,
      ),
  });

  const pageStats = useMemo(() => {
    const rows = tasksQuery.data?.data ?? [];
    return {
      total: tasksQuery.data?.meta.total ?? 0,
      open: rows.filter((task) => task.status !== 'done').length,
      urgent: rows.filter((task) => task.priority === 'urgent').length,
    };
  }, [tasksQuery.data]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await tasksApi.create({
        title: String(form.get('title') || ''),
        description: String(form.get('description') || '') || undefined,
        priority: (String(form.get('priority') || 'normal') as 'urgent' | 'normal'),
        dueDate: String(form.get('dueDate') || '') || undefined,
      });
      push({ tone: 'success', title: t('tasks.created') });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete(id: string) {
    try {
      await tasksApi.complete(id);
      push({ tone: 'success', title: t('tasks.completed') });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      title={t('tasks.title')}
      description={t('tasks.description')}
      primaryAction={<Button onClick={() => setCreateOpen(true)}>{t('tasks.newTask')}</Button>}
      stats={
        tasksQuery.data ? (
          <>
            <StatsCard label={t('bookings.total')} value={pageStats.total} />
            <StatsCard label={t('common.open')} value={pageStats.open} tone="accent" />
            <StatsCard label={t('common.urgent')} value={pageStats.urgent} tone="danger" />
          </>
        ) : undefined
      }
      filters={
        <>
          <Select
            className="max-w-xs"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('bookings.allStatuses')}</option>
            <option value="open">{t('common.open')}</option>
            <option value="done">{t('common.done')}</option>
          </Select>
          <Select
            className="max-w-xs"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('all')}</option>
            <option value="urgent">{t('common.urgent')}</option>
            <option value="normal">{t('common.normal')}</option>
          </Select>
        </>
      }
    >
      {tasksQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : tasksQuery.isError ? (
        <ErrorState description={t('tasks.loadFailed')} onRetry={() => tasksQuery.refetch()} />
      ) : !tasksQuery.data?.data.length ? (
        <EmptyState title={t('tasks.empty')} />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {tasksQuery.data.data.map((task) => (
              <Card key={task.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{task.title}</p>
                      <StatusBadge tone={task.priority === 'urgent' ? 'danger' : 'default'}>
                        {task.priority}
                      </StatusBadge>
                      <StatusBadge tone={task.status === 'done' ? 'success' : 'accent'}>
                        {task.status}
                      </StatusBadge>
                    </div>
                    {task.description ? (
                      <p className="mt-1 text-sm text-[var(--ink-muted)]">{task.description}</p>
                    ) : null}
                    {task.dueDate ? (
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {t('tasks.dueDate')} {formatDate(task.dueDate)}
                      </p>
                    ) : null}
                  </div>
                  {task.status !== 'done' ? (
                    <Button variant="secondary" onClick={() => handleComplete(task.id)}>
                      {t('tasks.complete')}
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <Pagination
              page={tasksQuery.data.meta.page}
              limit={tasksQuery.data.meta.limit}
              total={tasksQuery.data.meta.total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <DialogShell open={createOpen} title={t('tasks.newTask')} onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="taskTitle">{t('tasks.titleLabel')}</Label>
            <Input id="taskTitle" name="title" required />
          </div>
          <div>
            <Label htmlFor="taskDescription">{t('tasks.descriptionLabel')}</Label>
            <Textarea id="taskDescription" name="description" rows={3} />
          </div>
          <div>
            <Label htmlFor="taskPriority">{t('tasks.priority')}</Label>
            <Select id="taskPriority" name="priority" defaultValue="normal">
              <option value="normal">{t('common.normal')}</option>
              <option value="urgent">{t('common.urgent')}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="taskDueDate">{t('tasks.dueDate')}</Label>
            <Input id="taskDueDate" name="dueDate" type="date" />
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
    </PageScaffold>
  );
}
