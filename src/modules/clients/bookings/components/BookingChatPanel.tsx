import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, ErrorState, Input, Skeleton, useToast } from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { chatApi, chatKeys } from '@/modules/tools/chat/services/chat.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import {
  getOpsSocket,
  setActiveChatConversationId,
} from '@/shared/realtime/useOpsRealtime';

type Props = { bookingId: string };

function elapsedLabel(iso: string | null) {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function BookingChatPanel({ bookingId }: Props) {
  const { push } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const thread = useQuery({
    queryKey: ['chat', 'booking-thread', bookingId],
    queryFn: () => chatApi.bookingThread(bookingId),
  });

  const conversationId = thread.data?.id ?? '';

  const messages = useQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: ({ signal }) => chatApi.messages(conversationId, { limit: 100 }, signal),
    enabled: Boolean(conversationId),
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (!conversationId) return;
    setActiveChatConversationId(conversationId);
    const socket = getOpsSocket();
    socket?.emit('chat.join', { conversationId });
    return () => {
      socket?.emit('chat.leave', { conversationId });
      setActiveChatConversationId(null);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.data]);

  useEffect(() => {
    const rows = messages.data ?? [];
    if (!conversationId || !rows.length) return;
    const last = rows[rows.length - 1];
    void chatApi.markRead(conversationId, last.id).catch(() => undefined);
  }, [conversationId, messages.data]);

  const send = useMutation({
    mutationFn: () => chatApi.sendMessage(conversationId, text.trim()),
    onSuccess: async () => {
      setText('');
      await qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : 'Could not send',
      }),
  });

  if (thread.isLoading) return <Skeleton className="h-48" />;
  if (thread.isError || !thread.data) {
    return (
      <ErrorState
        description={
          thread.error instanceof Error
            ? thread.error.message
            : 'Could not open booking chat'
        }
        onRetry={() => thread.refetch()}
      />
    );
  }

  const rows = messages.data ?? [];

  return (
    <div className="flex h-[min(32rem,65vh)] flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--ink)]">Booking support</p>
        <p className="text-xs text-[var(--ink-muted)]">
          {thread.data.znCode ?? bookingId.slice(0, 8)}
          {thread.data.clientName ? ` · ${thread.data.clientName}` : ''}
          {' · '}
          realtime
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.isLoading ? <Skeleton className="h-24 w-full" /> : null}
        {messages.isError ? (
          <ErrorState
            description={
              messages.error instanceof Error
                ? messages.error.message
                : 'Could not load messages'
            }
            onRetry={() => messages.refetch()}
          />
        ) : null}
        {!messages.isLoading && !messages.isError && !rows.length ? (
          <p className="text-sm text-[var(--ink-muted)]">No messages yet. Start the conversation.</p>
        ) : null}
        {rows.map((m) => {
          const mine = m.senderStaffId
            ? m.senderStaffId === user?.id
            : m.senderClientId === user?.id;
          const body = (m.body ?? '').trim();
          return (
            <div
              key={m.id}
              className={
                mine
                  ? 'ml-6 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--ink)] sm:ml-10'
                  : 'mr-6 rounded-xl bg-[var(--bg-muted)] px-3 py-2 text-sm text-[var(--ink)] sm:mr-10'
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--ink)]">
                  {mine
                    ? 'You'
                    : m.senderName ??
                      (m.senderType === 'client' ? 'Client' : 'Staff')}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)]">
                  {elapsedLabel(m.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">
                {body || (
                  <span className="italic text-[var(--ink-muted)]">(empty message)</span>
                )}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2 border-t border-[var(--line)] bg-[var(--bg-elevated)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send.mutate();
        }}
      >
        <Input
          className="flex-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
        />
        <Button type="submit" disabled={!text.trim()} loading={send.isPending}>
          Send
        </Button>
      </form>
    </div>
  );
}
