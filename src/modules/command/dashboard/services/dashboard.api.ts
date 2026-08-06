import { apiRequest, toQuery } from '@/shared/api/client';
import type { DashboardSummary, DailyOperationItem, EodReport, UrgentAlert } from '@/shared/api/types';

export const dashboardApi = {
  summary(signal?: AbortSignal) {
    return apiRequest<DashboardSummary>({ url: '/dashboard/summary' }, signal);
  },
  urgentAlerts(signal?: AbortSignal) {
    return apiRequest<UrgentAlert[]>({ url: '/dashboard/urgent-alerts' }, signal);
  },
  schedule(date: 'today' | 'tomorrow' | string = 'today', signal?: AbortSignal) {
    return apiRequest<DailyOperationItem[]>({ url: '/dashboard/schedule', params: toQuery({ date }) }, signal);
  },
  createEod(reportDate?: string) {
    return apiRequest<EodReport>({ method: 'POST', url: '/dashboard/eod-report', data: { reportDate } });
  },
  sendEod(id: string) {
    return apiRequest<EodReport>({ method: 'POST', url: `/dashboard/eod-report/${id}/send` });
  },
};
