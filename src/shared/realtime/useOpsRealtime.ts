import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken, getWsUrl } from '@/shared/api/client';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useToast } from '@/shared/ui';
import { chatKeys } from '@/modules/tools/chat/services/chat.api';
import type { ChatMessage } from '@/shared/api/types';

/** Shared socket for staff shell — chat join/typing + ops invalidation. */
let sharedSocket: Socket | null = null;

export function getOpsSocket(): Socket | null {
  return sharedSocket;
}

export function useOpsRealtime() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = getAccessToken();
    if (!token) return;

    const ns = io(getWsUrl(), {
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    socketRef.current = ns;
    sharedSocket = ns;

    const invalidate = (...queryKey: string[]) => {
      queryClient.invalidateQueries({ queryKey });
    };

    ns.on('payment.recorded', () => {
      invalidate('payments');
      invalidate('finance');
      invalidate('bookings');
      invalidate('dashboard');
    });
    ns.on('payment.created', () => {
      invalidate('payments');
      invalidate('finance');
      invalidate('bookings');
      invalidate('dashboard');
    });
    ns.on('payment.updated', () => {
      invalidate('payments');
      invalidate('finance');
      invalidate('bookings');
      invalidate('dashboard');
    });
    ns.on('sos.created', () => {
      invalidate('sos');
      invalidate('dashboard');
      push({ tone: 'error', title: 'New SOS alert' });
    });
    ns.on('sos.resolved', () => {
      invalidate('sos');
      invalidate('dashboard');
    });
    ns.on('message.new', (payload: ChatMessage) => {
      if (payload?.conversationId) {
        queryClient.setQueryData<ChatMessage[]>(
          chatKeys.messages(payload.conversationId),
          (prev) => {
            if (!prev) return prev;
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          },
        );
      }
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    });
    ns.on('message.translated', (payload: ChatMessage) => {
      if (!payload?.conversationId || !payload.id) return;
      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messages(payload.conversationId),
        (prev) =>
          prev?.map((m) =>
            m.id === payload.id
              ? { ...m, bodyTranslated: payload.bodyTranslated ?? m.bodyTranslated }
              : m,
          ),
      );
    });
    ns.on('message.read', () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    });
    ns.on('task.updated', () => {
      invalidate('tasks');
      invalidate('dashboard');
      invalidate('daily-operations');
    });
    ns.on('booking.created', () => {
      invalidate('bookings');
      invalidate('dashboard');
    });
    ns.on('driver.updated', () => {
      invalidate('drivers');
      invalidate('dashboard');
    });
    ns.on('notification.created', () => invalidate('notifications'));
    ns.on('notification.new', () => invalidate('notifications'));
    ns.on('edit_request.created', () => {
      invalidate('edit-requests');
      invalidate('dashboard');
    });
    ns.on('edit_request.updated', () => {
      invalidate('edit-requests');
      invalidate('dashboard');
    });

    return () => {
      ns.disconnect();
      if (sharedSocket === ns) sharedSocket = null;
      socketRef.current = null;
    };
  }, [isAuthenticated, queryClient, push]);
}
