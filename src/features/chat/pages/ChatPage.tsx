import { FormEvent, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { chatApi } from '../services/chat.api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageScaffold,
  Skeleton,
  StatsCard,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { cn, formatDate } from '@/shared/lib/cn';

export function ChatPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const conversationsQuery = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: ({ signal }) => chatApi.conversations(signal),
  });

  useEffect(() => {
    if (!activeId && conversationsQuery.data?.length) {
      setActiveId(conversationsQuery.data[0].id);
    }
  }, [activeId, conversationsQuery.data]);

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', activeId],
    queryFn: ({ signal }) => chatApi.messages(activeId!, undefined, signal),
    enabled: Boolean(activeId),
    refetchInterval: 10_000,
  });

  const unreadTotal =
    conversationsQuery.data?.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0) ?? 0;

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!activeId || !message.trim()) return;
    setSending(true);
    try {
      await chatApi.sendMessage(activeId, message.trim());
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', activeId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } catch (error) {
      push({
        tone: 'error',
        title: t('chat.sendFailed'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <PageScaffold
      title={t('chat.title')}
      description={t('chat.description')}
      stats={
        conversationsQuery.data ? (
          <>
            <StatsCard label={t('chat.conversations')} value={conversationsQuery.data.length} />
            <StatsCard
              label={t('notificationsPage.unread')}
              value={unreadTotal}
              tone="accent"
            />
          </>
        ) : undefined
      }
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <h2 className="text-lg font-bold">{t('chat.conversations')}</h2>
          <div className="mt-4 flex flex-col gap-2">
            {conversationsQuery.isLoading ? (
              <Skeleton className="h-12" />
            ) : conversationsQuery.isError ? (
              <ErrorState
                description={t('somethingWrong')}
                onRetry={() => conversationsQuery.refetch()}
              />
            ) : !conversationsQuery.data?.length ? (
              <EmptyState title={t('chat.noChats')} />
            ) : (
              conversationsQuery.data.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveId(conv.id)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-left text-sm',
                    activeId === conv.id
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'hover:bg-[var(--bg-muted)]/70',
                  )}
                >
                  <p className="font-semibold">{conv.title ?? conv.type}</p>
                  {conv.unreadCount > 0 ? (
                    <p className="text-xs text-[var(--accent)]">
                      {conv.unreadCount} {t('notificationsPage.unread')}
                    </p>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="flex min-h-[480px] flex-col">
          {!activeId ? (
            <EmptyState title={t('chat.select')} />
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {messagesQuery.isLoading ? (
                  <Skeleton className="h-24" />
                ) : messagesQuery.isError ? (
                  <ErrorState
                    description={t('somethingWrong')}
                    onRetry={() => messagesQuery.refetch()}
                  />
                ) : !messagesQuery.data?.length ? (
                  <EmptyState title={t('chat.noChats')} />
                ) : (
                  messagesQuery.data.map((msg) => (
                    <div key={msg.id} className="rounded-xl bg-[var(--bg-muted)] p-3 text-sm">
                      <p className="font-semibold">{msg.senderName ?? msg.senderType}</p>
                      <p className="mt-1">{msg.body}</p>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSend} className="mt-4 flex gap-2">
                <Input
                  placeholder={t('chat.writeMessage')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button type="submit" loading={sending}>
                  {t('chat.send')}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </PageScaffold>
  );
}
