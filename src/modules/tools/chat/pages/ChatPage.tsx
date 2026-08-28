import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { chatApi, chatKeys } from '../services/chat.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { getOpsSocket, setActiveChatConversationId } from '@/shared/realtime/useOpsRealtime';
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
import type { Conversation } from '@/shared/api/types';

type Filter = 'all' | 'team' | 'clients';

function elapsedLabel(iso: string | null) {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function conversationLabel(ch: Conversation) {
  if (ch.title) return ch.title;
  if (ch.znCode && ch.clientName) return `${ch.znCode} — ${ch.clientName}`;
  if (ch.znCode) return ch.znCode;
  return ch.type;
}

export function ChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { push } = useToast();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversationId, setConversationId] = useState(
    searchParams.get('conversationId') ?? '',
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [text, setText] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmit = useRef(0);
  const bookingParam = searchParams.get('bookingId');
  const openedBookingRef = useRef<string | null>(null);

  const conversationsQuery = useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: ({ signal }) => chatApi.conversations(signal),
    staleTime: 8_000,
  });

  const openBookingThread = useMutation({
    mutationFn: (bookingId: string) => chatApi.bookingThread(bookingId),
    onSuccess: async (row) => {
      setConversationId(row.id);
      const next = new URLSearchParams(searchParams);
      next.set('conversationId', row.id);
      if (row.bookingId) next.set('bookingId', row.bookingId);
      setSearchParams(next);
      await qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
    onError: (err) => {
      openedBookingRef.current = null;
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('somethingWrong'),
      });
    },
  });

  useEffect(() => {
    if (!bookingParam) return;
    if (openedBookingRef.current === bookingParam && conversationId) return;
    const existing = (conversationsQuery.data ?? []).find(
      (c) => c.bookingId === bookingParam && c.type === 'booking_support',
    );
    if (existing) {
      openedBookingRef.current = bookingParam;
      setConversationId(existing.id);
      return;
    }
    if (conversationsQuery.isLoading || openBookingThread.isPending) return;
    openedBookingRef.current = bookingParam;
    openBookingThread.mutate(bookingParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingParam, conversationsQuery.data, conversationsQuery.isLoading]);

  const conversations = useMemo(() => {
    const rows = conversationsQuery.data ?? [];
    const filtered =
      filter === 'team'
        ? rows.filter((c) => c.type === 'team' || c.type === 'dm')
        : filter === 'clients'
          ? rows.filter(
              (c) => c.type === 'booking_support' || c.type === 'client_direct',
            )
          : rows;
    return [...filtered].sort((a, b) => {
      const aAt = a.lastMessageAt ?? a.createdAt;
      const bAt = b.lastMessageAt ?? b.createdAt;
      return new Date(bAt).getTime() - new Date(aAt).getTime();
    });
  }, [conversationsQuery.data, filter]);

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

  const messages = messagesQuery.data ?? [];
  const markedReadFor = useRef<string | null>(null);

  function clearUnreadBadge(id: string) {
    qc.setQueryData(chatKeys.conversations(), (prev: typeof conversationsQuery.data) => {
      if (!prev) return prev;
      return prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c));
    });
  }

  async function markConversationRead(id: string, lastMessageId: string) {
    if (!lastMessageId || lastMessageId.startsWith('temp-')) return;
    clearUnreadBadge(id);
    try {
      await chatApi.markRead(id, lastMessageId);
      markedReadFor.current = `${id}:${lastMessageId}`;
    } catch {
      /* keep badge cleared locally; next open retries */
    }
  }

  // Join room when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setActiveChatConversationId(null);
      return;
    }
    setActiveChatConversationId(conversationId);
    clearUnreadBadge(conversationId);
    const socket = getOpsSocket();
    socket?.emit('chat.join', { conversationId });
    return () => {
      socket?.emit('chat.leave', { conversationId });
      markedReadFor.current = null;
      setActiveChatConversationId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Mark latest real message as read whenever the open inbox updates
  useEffect(() => {
    if (!conversationId || !messages.length) return;
    const lastReal = [...messages].reverse().find((m) => !m.id.startsWith('temp-'));
    if (!lastReal) return;
    const key = `${conversationId}:${lastReal.id}`;
    if (markedReadFor.current === key) return;
    void markConversationRead(conversationId, lastReal.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages]);

  // If a new message arrives while this inbox is open, keep badge at 0
  useEffect(() => {
    const socket = getOpsSocket();
    if (!socket || !conversationId) return;
    const onNew = (payload: { conversationId?: string; id?: string }) => {
      if (payload.conversationId !== conversationId || !payload.id) return;
      clearUnreadBadge(conversationId);
      if (!payload.id.startsWith('temp-')) {
        void markConversationRead(conversationId, payload.id);
      }
    };
    socket.on('message.new', onNew);
    return () => {
      socket.off('message.new', onNew);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Typing indicator from peers
  useEffect(() => {
    const socket = getOpsSocket();
    if (!socket) return;
    const onTyping = (payload: {
      conversationId?: string;
      userId?: string;
      userType?: string;
    }) => {
      if (payload.conversationId !== conversationId) return;
      if (payload.userId === user?.id) return;
      setTypingLabel(t('chat.typing'));
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingLabel(null), 2000);
    };
    socket.on('chat.typing', onTyping);
    return () => {
      socket.off('chat.typing', onTyping);
    };
  }, [conversationId, user?.id, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingLabel]);

  const sendMutation = useMutation({
    mutationFn: ({ body }: { body: string; tempId: string }) =>
      chatApi.sendMessage(conversationId, body),
    onMutate: async ({ body, tempId }) => {
      setText('');
      const optimistic = {
        id: tempId,
        conversationId,
        body,
        createdAt: new Date().toISOString(),
        senderType: 'staff' as const,
        senderStaffId: user?.id ?? null,
        senderClientId: null,
        senderName: null,
      };
      await qc.cancelQueries({ queryKey: chatKeys.messages(conversationId) });
      const previous = qc.getQueryData(chatKeys.messages(conversationId));
      qc.setQueryData(chatKeys.messages(conversationId), (prev: typeof messages | undefined) => [
        ...(prev ?? []),
        optimistic,
      ]);
      qc.setQueryData(chatKeys.conversations(), (prev: typeof conversationsQuery.data) => {
        if (!prev) return prev;
        return prev.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessageAt: optimistic.createdAt, unreadCount: 0 }
            : c,
        );
      });
      return { previous, tempId };
    },
    onSuccess: (msg, { tempId }) => {
      qc.setQueryData(chatKeys.messages(conversationId), (prev: typeof messages | undefined) => {
        if (!prev) return [msg];
        const withoutTemp = prev.filter((m) => m.id !== tempId && m.id !== msg.id);
        return [...withoutTemp, msg];
      });
      // Background only — don't block the UI / don't refetch unread for open thread
      void chatApi.markRead(conversationId, msg.id).catch(() => undefined);
      clearUnreadBadge(conversationId);
    },
    onError: (err, { body }, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(chatKeys.messages(conversationId), ctx.previous);
      } else {
        qc.setQueryData(chatKeys.messages(conversationId), (prev: typeof messages | undefined) =>
          prev?.filter((m) => m.id !== ctx?.tempId),
        );
      }
      setText(body);
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : t('chat.sendFailed'),
      });
    },
  });

  function submitMessage() {
    const body = text.trim();
    if (!body || !conversationId) return;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sendMutation.mutate({ body, tempId });
  }

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

  const active = conversations.find((c) => c.id === conversationId)
    ?? (conversationsQuery.data ?? []).find((c) => c.id === conversationId);

  function selectConversation(id: string) {
    clearUnreadBadge(id);
    setConversationId(id);
    const next = new URLSearchParams(searchParams);
    next.set('conversationId', id);
    const row = (conversationsQuery.data ?? []).find((c) => c.id === id);
    if (row?.bookingId) next.set('bookingId', row.bookingId);
    else next.delete('bookingId');
    setSearchParams(next);
  }

  function onType(value: string) {
    setText(value);
    if (!conversationId || !value.trim()) return;
    const now = Date.now();
    if (now - lastTypingEmit.current < 900) return;
    lastTypingEmit.current = now;
    getOpsSocket()?.emit('chat.typing', { conversationId });
  }

  return (
    <PageScaffold title={t('chat.title')} description={t('chat.description')}>
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ['all', t('chat.filterAll')],
            ['team', t('chat.filterTeam')],
            ['clients', t('chat.filterClients')],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={
              filter === id
                ? 'rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]'
                : 'rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink-muted)]'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-[520px] gap-3 lg:grid-cols-[280px_1fr]">
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
          {conversationsQuery.isLoading || openBookingThread.isPending ? (
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
                  onClick={() => selectConversation(ch.id)}
                  className={
                    conversationId === ch.id
                      ? 'mb-1 w-full rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-start text-sm font-medium text-[var(--accent)]'
                      : 'mb-1 w-full rounded-lg px-3 py-2 text-start text-sm text-[var(--ink-muted)] hover:bg-[var(--bg-muted)]'
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate">{conversationLabel(ch)}</span>
                    {ch.unreadCount > 0 ? (
                      <StatusBadge tone="warning">{ch.unreadCount}</StatusBadge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-normal text-[var(--ink-muted)]">
                    {ch.type === 'booking_support' || ch.type === 'client_direct'
                      ? t('chat.clientThread')
                      : ch.type}
                    {ch.lastMessageAt ? ` · ${elapsedLabel(ch.lastMessageAt)}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="flex flex-col rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <div className="text-sm font-semibold">
              {active ? conversationLabel(active) : t('chat.select')}
            </div>
            {active?.znCode ? (
              <div className="text-xs text-[var(--ink-muted)]">
                {active.znCode}
                {active.clientName ? ` · ${active.clientName}` : ''}
                {' · '}
                {t('chat.realtime')}
              </div>
            ) : active ? (
              <div className="text-xs text-[var(--ink-muted)]">{t('chat.realtime')}</div>
            ) : null}
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
                  const mine = m.senderStaffId
                    ? m.senderStaffId === user?.id
                    : m.senderClientId === user?.id;
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
                          {mine
                            ? t('chat.you')
                            : m.senderName ??
                              (m.senderType === 'client' ? t('chat.client') : t('chat.staff'))}
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
              {typingLabel ? (
                <p className="text-xs italic text-[var(--ink-muted)]">{typingLabel}</p>
              ) : null}
              <div ref={bottomRef} />
            </div>
          )}
          <form
            className="flex gap-2 border-t border-[var(--line)] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              submitMessage();
            }}
          >
            <Input
              value={text}
              onChange={(e) => onType(e.target.value)}
              placeholder={t('chat.writeMessage')}
              disabled={!conversationId}
              autoComplete="off"
            />
            <Button type="submit" disabled={!conversationId || !text.trim()}>
              {t('chat.send')}
            </Button>
          </form>
        </div>
      </div>
    </PageScaffold>
  );
}
