import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken, getWsUrl } from '@/shared/api/client';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useToast } from '@/shared/ui';
import { chatKeys } from '@/modules/tools/chat/services/chat.api';
import type { ChatMessage, Conversation } from '@/shared/api/types';

/** Shared socket for staff shell — chat join/typing + ops invalidation. */
let sharedSocket: Socket | null = null;
/** Conversation currently open in Team Chat (unread badges stay clear). */
let activeChatConversationId: string | null = null;

export function getOpsSocket(): Socket | null {
  return sharedSocket;
}

export function setActiveChatConversationId(id: string | null) {
  activeChatConversationId = id;
}

export function useOpsRealtime() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = getAccessToken();
    if (!token) return;
    const myStaffId = user?.id ?? null;

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
            if (!prev) return [payload];
            if (prev.some((m) => m.id === payload.id)) return prev;
            const tempIdx = prev.findIndex(
              (m) =>
                m.id.startsWith('temp-') &&
                m.body === payload.body &&
                (m.senderStaffId === payload.senderStaffId ||
                  m.senderClientId === payload.senderClientId),
            );
            if (tempIdx >= 0) {
              const next = [...prev];
              next[tempIdx] = payload;
              return next;
            }
            return [...prev, payload];
          },
        );
        queryClient.setQueryData(chatKeys.conversations(), (prev: Conversation[] | undefined) => {
          if (!prev) return prev;
          return prev.map((c) => {
            if (c.id !== payload.conversationId) return c;
            const isActive = activeChatConversationId === c.id;
            const fromSelf = Boolean(myStaffId && payload.senderStaffId === myStaffId);
            return {
              ...c,
              lastMessageAt: payload.createdAt,
              unreadCount: isActive || fromSelf ? 0 : c.unreadCount + 1,
            };
          });
        });
      }
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
      /* local clearUnreadBadge handles open thread */
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
      invalidate('operations');
    });
    ns.on('driver.gps', () => {
      invalidate('drivers');
    });
    const assignmentHandler = (payload?: { status?: string; znCode?: string | null }) => {
      invalidate('drivers');
      invalidate('dashboard');
      invalidate('operations');
      if (payload?.status === 'rejected') {
        push({ tone: 'error', title: 'Driver declined assignment' });
      } else if (payload?.status === 'accepted') {
        push({ tone: 'success', title: 'Driver accepted assignment' });
      } else if (payload?.status === 'in_progress') {
        push({ tone: 'success', title: 'Driver started trip' });
      } else if (payload?.status === 'completed') {
        push({ tone: 'success', title: 'Trip completed' });
      } else if (payload?.status === 'pending') {
        push({ tone: 'info', title: 'New driver assignment' });
      }
    };
    ns.on('assignment.created', assignmentHandler);
    ns.on('assignment.accepted', assignmentHandler);
    ns.on('assignment.rejected', assignmentHandler);
    ns.on('assignment.started', assignmentHandler);
    ns.on('assignment.completed', assignmentHandler);
    ns.on('assignment.cancelled', assignmentHandler);
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
  }, [isAuthenticated, queryClient, push, user?.id]);
}
