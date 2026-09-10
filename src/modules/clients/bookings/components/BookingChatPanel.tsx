import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, Input, Skeleton, useToast } from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { chatApi, chatKeys } from '@/modules/tools/chat/services/chat.api';
import {
  getOpsSocket,
  setActiveChatConversationId,
} from '@/shared/realtime/useOpsRealtime';
import { formatDate } from '@/shared/lib/cn';

type Props = { bookingId: string };

export function BookingChatPanel({ bookingId }: Props) {
  const { push } = useToast();
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
      <EmptyState
        title="Could not open booking chat"
        description={thread.error?.message}
      />
    );
  }

  const rows = messages.data ?? [];

  return (
    <div className="flex h-[min(28rem,60vh)] flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="border-b border-[var(--line)] px-3 py-2 text-sm text-[var(--ink-muted)]">
        Booking support · {thread.data.znCode ?? bookingId.slice(0, 8)}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {!rows.length ? (
          <p className="text-sm text-[var(--ink-muted)]">No messages yet. Start the conversation.</p>
        ) : (
          rows.map((m) => (
            <div key={m.id} className="rounded-lg bg-[var(--surface-2,#f6f6f6)] px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--ink-muted)]">
                <span>{m.senderName ?? m.senderType}</span>
                <span>{formatDate(m.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t border-[var(--line)] p-3"
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
