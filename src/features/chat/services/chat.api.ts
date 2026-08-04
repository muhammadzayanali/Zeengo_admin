import { apiRequest, toQuery } from '@/shared/api/client';
import type { ChatMessage, ClientThread, Conversation } from '@/shared/api/types';

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
