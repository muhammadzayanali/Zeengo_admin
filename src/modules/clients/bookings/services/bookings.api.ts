import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type {
  Booking,
  BookingNote,
  BookingStats,
  ChecklistItem,
  Payment,
} from '@/shared/api/types';

export const bookingsApi = {
  list(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<Booking>({ url: '/bookings', params: toQuery(params) }, signal);
  },
  stats(signal?: AbortSignal) {
    return apiRequest<BookingStats>({ url: '/bookings/stats' }, signal);
  },
  get(id: string, signal?: AbortSignal) {
    return apiRequest<Booking>({ url: `/bookings/${id}` }, signal);
  },
  create(data: Record<string, unknown>) {
    return apiRequest<Booking>({ method: 'POST', url: '/bookings', data });
  },
  update(id: string, data: Record<string, unknown>) {
    return apiRequest<Booking>({ method: 'PATCH', url: `/bookings/${id}`, data });
  },
  checklist(id: string, signal?: AbortSignal) {
    return apiRequest<ChecklistItem[]>({ url: `/bookings/${id}/checklist` }, signal);
  },
  addChecklist(id: string, data: { title: string; sortOrder?: number }) {
    return apiRequest<ChecklistItem>({
      method: 'POST',
      url: `/bookings/${id}/checklist`,
      data,
    });
  },
  patchChecklist(id: string, itemId: string, data: Record<string, unknown>) {
    return apiRequest<ChecklistItem>({
      method: 'PATCH',
      url: `/bookings/${id}/checklist/${itemId}`,
      data,
    });
  },
  deleteChecklist(id: string, itemId: string) {
    return apiRequest({ method: 'DELETE', url: `/bookings/${id}/checklist/${itemId}` });
  },
  notes(id: string, signal?: AbortSignal) {
    return apiRequest<BookingNote[]>({ url: `/bookings/${id}/notes` }, signal);
  },
  addNote(id: string, body: string) {
    return apiRequest<BookingNote>({
      method: 'POST',
      url: `/bookings/${id}/notes`,
      data: { body },
    });
  },
  payments(id: string, signal?: AbortSignal) {
    return apiRequest<Payment[]>({ url: `/bookings/${id}/payments` }, signal);
  },
  vendorBookings(id: string, signal?: AbortSignal) {
    return apiRequest<
      Array<{
        id: string;
        vendorId: string;
        vendorName: string;
        vendorType: string;
        vendorCity: string | null;
        bookingId: string;
        znCode: string;
        clientName: string;
        itineraryItemId: string | null;
        amount: number | null;
        commissionAmount: number | null;
        serviceDate: string | null;
        pax: number | null;
        details: string | null;
        voucherCode: string | null;
        voucherSentAt: string | null;
        status: string;
        createdAt: string;
      }>
    >({ url: `/bookings/${id}/vendor-bookings` }, signal);
  },
};
