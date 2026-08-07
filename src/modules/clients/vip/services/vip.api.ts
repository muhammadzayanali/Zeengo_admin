import { apiRequest } from '@/shared/api/client';
import type {
  EditRequest,
  VipCandidate,
  VipClient,
  VipClientFile,
  VipEscalateResult,
  VipOverview,
} from '@/shared/api/types';

export const vipKeys = {
  all: ['vip'] as const,
  overview: () => [...vipKeys.all, 'overview'] as const,
  clients: () => [...vipKeys.all, 'clients'] as const,
  requests: () => [...vipKeys.all, 'requests'] as const,
  candidates: () => [...vipKeys.all, 'candidates'] as const,
  file: (bookingId: string) => [...vipKeys.all, 'file', bookingId] as const,
};

export const vipApi = {
  overview(signal?: AbortSignal) {
    return apiRequest<VipOverview>({ url: '/vip/overview' }, signal);
  },
  candidates(signal?: AbortSignal) {
    return apiRequest<VipCandidate[]>({ url: '/vip/candidates' }, signal);
  },
  clients(signal?: AbortSignal) {
    return apiRequest<VipClient[]>({ url: '/vip/clients' }, signal);
  },
  clientFile(bookingId: string, signal?: AbortSignal) {
    return apiRequest<VipClientFile>({ url: `/vip/clients/${bookingId}` }, signal);
  },
  requests(signal?: AbortSignal) {
    return apiRequest<EditRequest[]>({ url: '/vip/requests' }, signal);
  },
  activate(bookingId: string) {
    return apiRequest<VipClient>({
      method: 'POST',
      url: '/vip/activate',
      data: { bookingId },
    });
  },
  escalate(bookingId: string, note?: string) {
    return apiRequest<VipEscalateResult>({
      method: 'POST',
      url: `/vip/clients/${bookingId}/escalate`,
      data: note ? { note } : {},
    });
  },
};
