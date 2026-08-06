import { apiRequest, toQuery } from '@/shared/api/client';
import type { FinanceSummary, RevenueByMethod } from '@/shared/api/types';

export const financeApi = {
  summary(signal?: AbortSignal) {
    return apiRequest<FinanceSummary>({ url: '/finance/summary' }, signal);
  },
  revenueByMethod(days = 30, signal?: AbortSignal) {
    return apiRequest<RevenueByMethod>({ url: '/finance/revenue-by-method', params: toQuery({ days }) }, signal);
  },
};
