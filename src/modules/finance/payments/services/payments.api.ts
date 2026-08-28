import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type { Payment, PaymentHistoryItem, SplizerClient } from '@/shared/api/types';

export type CashMethod = 'cash' | 'rajhi_transfer' | 'usdt_trc20' | 'usdt_bep20';
export type StripeAmountMode = 'deposit' | 'remaining' | 'custom';

export const paymentsApi = {
  cash(data: {
    bookingId?: string;
    znCode?: string;
    amount: number;
    method?: CashMethod;
    location?: string;
    notes?: string;
  }) {
    return apiRequest<Payment>({ method: 'POST', url: '/payments/cash', data });
  },
  stripeLink(data: {
    bookingId?: string;
    znCode?: string;
    amount?: number;
    amountMode?: StripeAmountMode;
    expiresInHours?: number;
  }) {
    return apiRequest<{ url?: string; stripeLinkUrl?: string; id?: string; amount?: number }>({
      method: 'POST',
      url: '/payments/stripe-link',
      data,
    });
  },
  history(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<PaymentHistoryItem>({ url: '/payments/history', params: toQuery(params) }, signal);
  },
  receipt(id: string, signal?: AbortSignal) {
    return apiRequest<PaymentHistoryItem>({ url: `/payments/${id}` }, signal);
  },
  list(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<Payment>({ url: '/payments', params: toQuery(params) }, signal);
  },
  splizerClients(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<SplizerClient>({ url: '/splizer/clients', params: toQuery(params) }, signal);
  },
  splizerByCode(znCode: string, signal?: AbortSignal) {
    return apiRequest<SplizerClient>(
      { url: `/splizer/clients/by-code/${encodeURIComponent(znCode.trim())}` },
      signal,
    );
  },
};
