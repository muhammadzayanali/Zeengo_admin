import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { chatApi, chatKeys } from '../services/chat.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageScaffold,
  Skeleton,
  StatusBadge,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';

function elapsedLabel(iso: string | null) {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { push } = useToast();
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState('');
  const [text, setText] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const conversationsQuery = useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: ({ signal }) => chatApi.conversations(signal),
    staleTime: 8_000,
  });

  const conversations = useMemo(() => {
    const rows = conversationsQuery.data ?? [];
    return [...rows].sort((a, b) => {
      const aAt = a.lastMessageAt ?? a.createdAt;
      const bAt = b.lastMessageAt ?? b.createdAt;
      return new Date(bAt).getTime() - new Date(aAt).getTime();
    });
  }, [conversationsQuery.data]);

  useEffect(() => {
    if (conversationId) return;
    if (conversations[0]) setConversationId(conversations[0].id);
  }, [conversationId, conversations]);

  const messagesQuery = useQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: ({ signal }) => chatApi.messages(conversationId, { limit: 80 }, signal),
    enabled: Boolean(conversationId),
    staleTime: 4_000,
  });

  const sendMutation = useMutation({
    mutationFn: () => chatApi.sendMessage(conversationId, text.trim()),
    onSuccess: async (msg) => {
      setText('');
      await qc.invalidateQueries({ queryKey: chatKeys.all });
      if (msg.id) {
        try {
          await chatApi.markRead(conversationId, msg.id);
        } catch {
          /* ignore */
        }
      }
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('chat.sendFailed'),
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      chatApi.createConversation({
        type: 'team',
        title: newTitle.trim() || 'Ops channel',
      }),
    onSuccess: async (row) => {
      setNewTitle('');
      setConversationId(row.id);
      await qc.invalidateQueries({ queryKey: chatKeys.conversations() });
      push({ tone: 'success', title: t('chat.channelCreated') });
    },
    onError: (err) => {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  const active = conversations.find((c) => c.id === conversationId);
  const messages = messagesQuery.data ?? [];

  return (
    <PageScaffold title={t('chat.title')} description={t('chat.description')}>
      <div className="grid min-h-[480px] gap-3 lg:grid-cols-[240px_1fr]">
        <aside className="flex flex-col rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow)]">
          <form
            className="mb-2 flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTitle.trim() || createMutation.isPending) return;
              createMutation.mutate();
            }}
          >
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('chat.newChannel')}
            />
            <Button type="submit" variant="secondary" loading={createMutation.isPending}>
              {t('add')}
            </Button>
          </form>
          {conversationsQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : conversationsQuery.isError ? (
            <ErrorState
              title={t('chat.loadFailed')}
              onRetry={() => void conversationsQuery.refetch()}
            />
          ) : conversations.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-[var(--ink-muted)]">
              {t('chat.noChats')}
            </p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {conversations.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setConversationId(ch.id)}
                  className={
                    conversationId === ch.id
                      ? 'mb-1 w-full rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-start text-sm font-medium text-[var(--accent)]'
                      : 'mb-1 w-full rounded-lg px-3 py-2 text-start text-sm text-[var(--ink-muted)] hover:bg-[var(--bg-muted)]'
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate">{ch.title ?? ch.type}</span>
                    {ch.unreadCount > 0 ? (
                      <StatusBadge tone="warning">{ch.unreadCount}</StatusBadge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-normal text-[var(--ink-muted)]">
                    {ch.type}
                    {ch.lastMessageAt ? ` · ${elapsedLabel(ch.lastMessageAt)}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="flex flex-col rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">
            {active?.title ?? t('chat.select')}
          </div>
          {!conversationId ? (
            <div className="p-6">
              <EmptyState title={t('chat.select')} description={t('chat.emptyHint')} />
            </div>
          ) : messagesQuery.isLoading ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : messagesQuery.isError ? (
            <div className="p-4">
              <ErrorState
                title={t('chat.loadFailed')}
                onRetry={() => void messagesQuery.refetch()}
              />
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">{t('chat.emptyThread')}</p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderStaffId ? m.senderStaffId === user?.id : false;
                  return (
                    <div
                      key={m.id}
                      className={
                        mine
                          ? 'ml-8 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm'
                          : 'mr-8 rounded-xl bg-[var(--bg-muted)] px-3 py-2 text-sm'
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {mine ? t('chat.you') : m.senderName ?? m.senderType ?? 'Staff'}
                        </span>
                        <span className="text-[11px] text-[var(--ink-muted)]">
                          {elapsedLabel(m.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
          <form
            className="flex gap-2 border-t border-[var(--line)] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim() || !conversationId || sendMutation.isPending) return;
              sendMutation.mutate();
            }}
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('chat.writeMessage')}
              disabled={!conversationId}
            />
            <Button
              type="submit"
              disabled={!conversationId || !text.trim()}
              loading={sendMutation.isPending}
            >
              {t('chat.send')}
            </Button>
          </form>
        </div>
      </div>
    </PageScaffold>
  );
}
