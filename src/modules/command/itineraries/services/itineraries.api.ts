import { apiRequest, toQuery } from '@/shared/api/client';
import type { DailyOperationsDay, ItineraryItem } from '@/shared/api/types';

export const itinerariesApi = {
  forBooking(bookingId: string, signal?: AbortSignal) {
    return apiRequest<ItineraryItem[]>({ url: `/bookings/${bookingId}/itinerary` }, signal);
  },
  addItem(bookingId: string, data: Record<string, unknown>) {
    return apiRequest<ItineraryItem>({ method: 'POST', url: `/bookings/${bookingId}/itinerary/items`, data });
  },
  importDays(bookingId: string, days: unknown[]) {
    return apiRequest({ method: 'POST', url: `/bookings/${bookingId}/itinerary/import`, data: { days } });
  },
  updateItem(itemId: string, data: Record<string, unknown>) {
    return apiRequest<ItineraryItem>({ method: 'PATCH', url: `/itinerary/items/${itemId}`, data });
  },
  moveItem(itemId: string, direction: 'up' | 'down') {
    return apiRequest<ItineraryItem>({
      method: 'POST',
      url: `/itinerary/items/${itemId}/move`,
      data: { direction },
    });
  },
  deleteItem(itemId: string) {
    return apiRequest({ method: 'DELETE', url: `/itinerary/items/${itemId}` });
  },
  dailyOps(date: string, signal?: AbortSignal) {
    return apiRequest<DailyOperationsDay>({ url: '/daily-operations', params: toQuery({ date }) }, signal);
  },
  weekOps(start: string, signal?: AbortSignal) {
    return apiRequest<DailyOperationsDay[] | { days: DailyOperationsDay[] }>({
      url: '/daily-operations/week',
      params: toQuery({ start }),
    }, signal);
  },
};
