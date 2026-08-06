import { apiRequest, toQuery } from '@/shared/api/client';
import type {
  DailyOperationsDay,
  DashboardOverview,
  DashboardSummary,
  EodReport,
  UrgentAlert,
} from '@/shared/api/types';

export const dashboardApi = {
  /** Preferred: single Redis-cached call for the whole dashboard screen. */
  overview(signal?: AbortSignal) {
    return apiRequest<DashboardOverview>({ url: '/dashboard/overview' }, signal);
  },
  summary(signal?: AbortSignal) {
    return apiRequest<DashboardSummary>({ url: '/dashboard/summary' }, signal);
  },
  urgentAlerts(signal?: AbortSignal) {
    return apiRequest<UrgentAlert[]>({ url: '/dashboard/urgent-alerts' }, signal);
  },
  schedule(date: 'today' | 'tomorrow' | string = 'today', signal?: AbortSignal) {
    return apiRequest<DailyOperationsDay>(
      { url: '/dashboard/schedule', params: toQuery({ date }) },
      signal,
    );
  },
  createEod(reportDate?: string) {
    return apiRequest<EodReport>({
      method: 'POST',
      url: '/dashboard/eod-report',
      data: reportDate ? { reportDate } : {},
    });
  },
  sendEod(id: string) {
    return apiRequest<EodReport>({
      method: 'POST',
      url: `/dashboard/eod-report/${id}/send`,
    });
  },
};
