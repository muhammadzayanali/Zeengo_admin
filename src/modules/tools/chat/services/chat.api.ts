import { apiRequest, toQuery } from '@/shared/api/client';
import type { ChatMessage, ClientThread, Conversation } from '@/shared/api/types';

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  messages: (id: string) => [...chatKeys.all, 'messages', id] as const,
  clientThreads: () => [...chatKeys.all, 'client-threads'] as const,
};

export const chatApi = {
  conversations(signal?: AbortSignal) {
    return apiRequest<Conversation[]>({ url: '/chat/conversations' }, signal);
  },
  createConversation(data: {
    type: string;
    participantIds?: string[];
    bookingId?: string;
    title?: string;
  }) {
    return apiRequest<Conversation>({
      method: 'POST',
      url: '/chat/conversations',
      data,
    });
  },
  /** Get or create booking support thread (Ops ↔ Client). */
  bookingThread(bookingId: string) {
    return apiRequest<Conversation>({
      method: 'POST',
      url: `/chat/bookings/${bookingId}/thread`,
    });
  },
  messages(
    conversationId: string,
    params?: { before?: string; limit?: number },
    signal?: AbortSignal,
  ) {
    return apiRequest<ChatMessage[]>(
      {
        url: `/chat/conversations/${conversationId}/messages`,
        params: toQuery(params),
      },
      signal,
    );
  },
  sendMessage(conversationId: string, body: string) {
    return apiRequest<ChatMessage>({
      method: 'POST',
      url: `/chat/conversations/${conversationId}/messages`,
      data: { body },
    });
  },
  markRead(conversationId: string, lastMessageId: string) {
    return apiRequest<{ read: boolean }>({
      method: 'POST',
      url: `/chat/conversations/${conversationId}/read`,
      data: { lastMessageId },
    });
  },
  clientThreads(signal?: AbortSignal) {
    return apiRequest<ClientThread[]>({ url: '/chat/client-threads' }, signal);
  },
};
