import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { emailKeys, emailsApi } from '../services/emails.api';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Pagination,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
  useToast,
  type StatusTone,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';

function elapsedLabel(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusTone(status: string): StatusTone {
  if (status === 'sent') return 'success';
  if (status === 'failed') return 'danger';
  return 'accent';
}

export function EmailPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const qc = useQueryClient();

  const [bookingId, setBookingId] = useState('');
  const [template, setTemplate] = useState('booking_confirmation');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const templatesQuery = useQuery({
    queryKey: emailKeys.templates(),
    queryFn: ({ signal }) => emailsApi.templates(signal),
    staleTime: 60_000,
  });

  const recipientsQuery = useQuery({
    queryKey: emailKeys.recipients(),
    queryFn: ({ signal }) => emailsApi.recipients(signal),
    staleTime: 20_000,
  });

  const logsQuery = useQuery({
    queryKey: emailKeys.logs(page),
    queryFn: ({ signal }) => emailsApi.list(page, signal),
    staleTime: 10_000,
  });

  const previewQuery = useQuery({
    queryKey: emailKeys.preview(bookingId, template),
    queryFn: () => emailsApi.preview(bookingId, template),
    enabled: Boolean(bookingId && template),
    staleTime: 15_000,
  });

  useEffect(() => {
    const selectedRecipient = recipientsQuery.data?.find((r) => r.bookingId === bookingId);
    setTo(selectedRecipient?.clientEmail ?? '');
    // Only refill To when the booking changes — do not overwrite a typed address on refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const sendMutation = useMutation({
    mutationFn: () =>
      emailsApi.send({
        bookingId,
        template,
        to: to.trim() || undefined,
      }),
    onSuccess: async (row) => {
      push({
        tone: 'success',
        title: t('emailSystem.sent'),
        description: t('emailSystem.sentDesc', {
          to: row.toEmail,
          zn: row.znCode ?? '',
        }),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: emailKeys.all }),
        qc.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('emailSystem.sendFailed'),
      });
    },
  });

  const templates = templatesQuery.data ?? [];
  const recipients = recipientsQuery.data ?? [];
  const logs = logsQuery.data?.data ?? [];
  const preview = previewQuery.data;
  const selected = recipients.find((r) => r.bookingId === bookingId);
  const canSend = Boolean(bookingId && template && to.trim());

  return (
    <PageScaffold
      title={t('emailSystem.title')}
      description={t('emailSystem.description')}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <h3 className="text-sm font-semibold">{t('emailSystem.composer')}</h3>
          <p className="text-xs text-[var(--ink-muted)]">{t('emailSystem.composerHint')}</p>

          <div>
            <Label htmlFor="email-booking">{t('emailSystem.booking')}</Label>
            <Select
              id="email-booking"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            >
              <option value="">{t('emailSystem.chooseBooking')}</option>
              {recipients.map((r) => (
                <option key={r.bookingId} value={r.bookingId}>
                  {r.znCode} — {r.clientName}
                  {r.clientEmail ? ` · ${r.clientEmail}` : ` · ${t('emailSystem.noEmail')}`}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="email-to">{t('emailSystem.to')}</Label>
            <Input
              id="email-to"
              type="email"
              value={to}
              placeholder={t('emailSystem.toPlaceholder')}
              onChange={(e) => setTo(e.target.value)}
            />
            {selected && !selected.clientEmail ? (
              <p className="mt-1 text-xs text-[var(--warning)]">{t('emailSystem.missingEmail')}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="email-template">{t('emailSystem.template')}</Label>
            <Select
              id="email-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            >
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={!canSend || sendMutation.isPending}
            loading={sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            {t('emailSystem.send')}
          </Button>

          <div className="border-t border-[var(--line)] pt-3">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">
              {t('emailSystem.library')}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {templates.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={
                      item.id === template
                        ? 'font-medium text-[var(--accent)]'
                        : 'text-[var(--ink)] hover:text-[var(--accent)]'
                    }
                    onClick={() => setTemplate(item.id)}
                  >
                    • {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
            <h3 className="text-sm font-semibold">{t('emailSystem.preview')}</h3>
            {!bookingId ? (
              <p className="mt-2 text-sm text-[var(--ink-muted)]">{t('emailSystem.previewHint')}</p>
            ) : previewQuery.isLoading ? (
              <Skeleton className="mt-3 h-40 w-full" />
            ) : previewQuery.isError ? (
              <ErrorState
                title={t('emailSystem.previewFailed')}
                onRetry={() => void previewQuery.refetch()}
              />
            ) : preview ? (
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  <span className="text-[var(--ink-muted)]">{t('emailSystem.subject')} · </span>
                  {preview.subject}
                </p>
                <Textarea readOnly rows={12} value={preview.body} />
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
            <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">
              {t('emailSystem.log')}
            </div>
            {logsQuery.isLoading ? (
              <div className="p-4">
                <Skeleton className="h-32 w-full" />
              </div>
            ) : logsQuery.isError ? (
              <div className="p-4">
                <ErrorState
                  title={t('emailSystem.loadFailed')}
                  onRetry={() => void logsQuery.refetch()}
                />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title={t('emailSystem.emptyLog')}
                  description={t('emailSystem.emptyLogHint')}
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                      <tr>
                        <th className="px-4 py-2 text-start">{t('emailSystem.to')}</th>
                        <th className="px-4 py-2 text-start">{t('emailSystem.template')}</th>
                        <th className="px-4 py-2 text-start">{t('common.status')}</th>
                        <th className="px-4 py-2 text-start">{t('emailSystem.when')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((row) => (
                        <tr key={row.id} className="border-t border-[var(--line)]">
                          <td className="px-4 py-2">
                            <div className="font-medium">{row.toEmail}</div>
                            <div className="text-xs text-[var(--ink-muted)]">
                              {row.znCode ?? row.toName ?? ''}
                            </div>
                          </td>
                          <td className="px-4 py-2">{row.templateName}</td>
                          <td className="px-4 py-2">
                            <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
                          </td>
                          <td className="px-4 py-2 text-[var(--ink-muted)]">
                            {elapsedLabel(row.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-[var(--line)] px-4 py-3">
                  <Pagination
                    page={logsQuery.data?.meta.page ?? page}
                    limit={logsQuery.data?.meta.limit ?? 20}
                    total={logsQuery.data?.meta.total ?? 0}
                    onPageChange={setPage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageScaffold>
  );
}
