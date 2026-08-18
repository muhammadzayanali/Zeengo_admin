import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type {
  EmailLogItem,
  EmailPreview,
  EmailRecipient,
  EmailTemplate,
} from '@/shared/api/types';

export const emailKeys = {
  all: ['emails'] as const,
  templates: () => [...emailKeys.all, 'templates'] as const,
  recipients: () => [...emailKeys.all, 'recipients'] as const,
  logs: (page?: number) => [...emailKeys.all, 'logs', page ?? 1] as const,
  preview: (bookingId: string, template: string) =>
    [...emailKeys.all, 'preview', bookingId, template] as const,
};

export const emailsApi = {
  templates(signal?: AbortSignal) {
    return apiRequest<EmailTemplate[]>({ url: '/emails/templates' }, signal);
  },
  recipients(signal?: AbortSignal) {
    return apiRequest<EmailRecipient[]>({ url: '/emails/recipients' }, signal);
  },
  list(page = 1, signal?: AbortSignal) {
    return apiList<EmailLogItem>(
      { url: '/emails', params: toQuery({ page, limit: 20 }) },
      signal,
    );
  },
  preview(bookingId: string, template: string) {
    return apiRequest<EmailPreview>({
      method: 'POST',
      url: '/emails/preview',
      data: { bookingId, template },
    });
  },
  send(data: { bookingId: string; template: string; to?: string }) {
    return apiRequest<EmailLogItem>({
      method: 'POST',
      url: '/emails/send',
      data,
    });
  },
};
