import { apiRequest } from '@/shared/api/client';
import type {
  AiEodReportResult,
  ChatbotResult,
  EmailDraftResult,
  ParseItineraryResult,
} from '@/shared/api/types';

export const aiApi = {
  parseItinerary(rawText: string) {
    return apiRequest<ParseItineraryResult>({
      method: 'POST',
      url: '/ai/parse-itinerary',
      data: { rawText },
    });
  },
  chatbot(message: string, sessionId?: string) {
    return apiRequest<ChatbotResult>({
      method: 'POST',
      url: '/ai/chatbot',
      data: { message, sessionId },
    });
  },
  emailDraft(data: {
    purpose: string;
    context?: string;
    tone?: 'formal' | 'friendly' | 'concise';
    recipientName?: string;
  }) {
    return apiRequest<EmailDraftResult>({
      method: 'POST',
      url: '/ai/email-draft',
      data,
    });
  },
  eodReport(reportDate?: string) {
    return apiRequest<AiEodReportResult>({
      method: 'POST',
      url: '/ai/eod-report',
      data: { reportDate },
    });
  },
};
