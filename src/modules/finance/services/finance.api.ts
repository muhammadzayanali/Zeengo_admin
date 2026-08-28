import { apiRequest, toQuery, ApiClientError } from '@/shared/api/client';
import { paymentsApi } from '@/modules/finance/payments/services/payments.api';
import type { FinanceSummary, RevenueByMethod, RevenueSeries, RevenueSeriesPoint } from '@/shared/api/types';

export type ChartRange = '7d' | 'month' | 'year';

function localDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function emptyPoint(date: string): RevenueSeriesPoint {
  return { date, stripe: 0, cash: 0, total: 0 };
}

function emptyLastDays(days: number): RevenueSeriesPoint[] {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const points: RevenueSeriesPoint[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    points.push(emptyPoint(localDateKey(day)));
  }
  return points;
}

function emptyCurrentMonth(): RevenueSeriesPoint[] {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const points: RevenueSeriesPoint[] = [];
  for (let day = 1; day <= last; day++) {
    points.push(emptyPoint(localDateKey(new Date(now.getFullYear(), now.getMonth(), day))));
  }
  return points;
}

function emptyCurrentYear(): RevenueSeriesPoint[] {
  const year = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, month) =>
    emptyPoint(localDateKey(new Date(year, month, 1))),
  );
}

function rangeStart(range: ChartRange) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (range === '7d') {
    now.setDate(now.getDate() - 6);
    return now;
  }
  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(now.getFullYear(), 0, 1);
}

async function fillFromHistory(
  points: RevenueSeriesPoint[],
  since: Date,
  keyFor: (d: Date) => string,
  signal?: AbortSignal,
) {
  const byDate = new Map(points.map((p) => [p.date, p]));
  let page = 1;
  const limit = 100;
  let total = Infinity;

  while ((page - 1) * limit < total && page <= 20) {
    const res = await paymentsApi.history(
      {
        page,
        limit,
        from: since.toISOString(),
      },
      signal,
    );
    total = res.meta.total;
    for (const tx of res.data) {
      if (tx.status !== 'paid') continue;
      const when = new Date(tx.paidAt || tx.createdAt);
      const bucket = byDate.get(keyFor(when));
      if (!bucket) continue;
      const amount = Number(tx.amount) || 0;
      if (tx.method === 'stripe') bucket.stripe += amount;
      else bucket.cash += amount;
      bucket.total += amount;
    }
    if (res.data.length === 0) break;
    page += 1;
  }

  return points;
}

export const financeApi = {
  summary(signal?: AbortSignal) {
    return apiRequest<FinanceSummary>({ url: '/finance/summary' }, signal);
  },
  revenueByMethod(days = 30, signal?: AbortSignal) {
    return apiRequest<RevenueByMethod>(
      { url: '/finance/revenue-by-method', params: toQuery({ days }) },
      signal,
    );
  },
  async revenueChart(range: ChartRange, signal?: AbortSignal): Promise<RevenueSeries> {
    if (range === '7d') {
      try {
        const series = await apiRequest<RevenueSeries>(
          { url: '/finance/revenue-series', params: toQuery({ days: 7 }) },
          signal,
        );
        return { ...series, grain: 'day', range: '7d', points: series.points };
      } catch (error) {
        if (!(error instanceof ApiClientError) || (error.status !== 404 && error.status !== 501)) {
          throw error;
        }
      }
    }

    const since = rangeStart(range);
    if (range === 'year') {
      const points = emptyCurrentYear();
      await fillFromHistory(points, since, monthKey, signal);
      return { grain: 'month', range, points };
    }

    const points = range === 'month' ? emptyCurrentMonth() : emptyLastDays(7);
    await fillFromHistory(points, since, localDateKey, signal);
    return { grain: 'day', range, points };
  },
};
