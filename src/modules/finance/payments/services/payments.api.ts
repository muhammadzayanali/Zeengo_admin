import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type { Payment, PaymentHistoryItem, SplizerClient } from '@/shared/api/types';

export type CashMethod = 'cash' | 'card_terminal' | 'transfer' | 'rajhi_transfer' | 'usdt_trc20';

export const paymentsApi = {
  cash(data: {
    bookingId: string;
    amount: number;
    method?: CashMethod;
    location?: string;
    notes?: string;
  }) {
    return apiRequest<Payment>({ method: 'POST', url: '/payments/cash', data });
  },
  stripeLink(data: { bookingId: string; amount: number; expiresInHours?: number }) {
    return apiRequest<{ url?: string; stripeLinkUrl?: string; id?: string }>({
      method: 'POST',
      url: '/payments/stripe-link',
      data,
    });
  },
  history(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<PaymentHistoryItem>({ url: '/payments/history', params: toQuery(params) }, signal);
  },
  list(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<Payment>({ url: '/payments', params: toQuery(params) }, signal);
  },
  splizerClients(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<SplizerClient>({ url: '/splizer/clients', params: toQuery(params) }, signal);
  },
  splizerByCode(znCode: string, signal?: AbortSignal) {
    return apiRequest<SplizerClient>({ url: `/splizer/clients/by-code/${znCode}` }, signal);
  },
};
