import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type {
  Vendor,
  VendorBookingRow,
  VendorDetail,
  VendorFinance,
  VendorStats,
  VendorVoucher,
} from '@/shared/api/types';

export interface CreateVendorInput {
  name: string;
  type: string;
  city?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  commissionPct?: number;
  paymentTerms?: string;
  cancellationPolicy?: string;
  notes?: string;
}

export interface UpdateVendorInput extends Partial<CreateVendorInput> {
  isActive?: boolean;
}

export interface AssignVendorInput {
  bookingId: string;
  serviceDate?: string;
  pax?: number;
  details?: string;
  amount?: number;
  itineraryItemId?: string;
  appendItinerary?: boolean;
}

export const vendorKeys = {
  all: ['vendors'] as const,
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    [...vendorKeys.all, 'list', params ?? {}] as const,
  stats: () => [...vendorKeys.all, 'stats'] as const,
  detail: (id: string) => [...vendorKeys.all, 'detail', id] as const,
};

export const vendorsApi = {
  list(
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      type?: string;
      city?: string;
      isActive?: boolean;
    },
    signal?: AbortSignal,
  ) {
    return apiList<Vendor>({ url: '/vendors', params: toQuery(params) }, signal);
  },
  stats(signal?: AbortSignal) {
    return apiRequest<VendorStats>({ url: '/vendors/stats' }, signal);
  },
  get(id: string, signal?: AbortSignal) {
    return apiRequest<VendorDetail>({ url: `/vendors/${id}` }, signal);
  },
  create(data: CreateVendorInput) {
    return apiRequest<Vendor>({ method: 'POST', url: '/vendors', data });
  },
  update(id: string, data: UpdateVendorInput) {
    return apiRequest<Vendor>({ method: 'PATCH', url: `/vendors/${id}`, data });
  },
  remove(id: string) {
    return apiRequest<Vendor>({ method: 'DELETE', url: `/vendors/${id}` });
  },
  assign(id: string, data: AssignVendorInput) {
    return apiRequest<VendorBookingRow>({
      method: 'POST',
      url: `/vendors/${id}/assign`,
      data,
    });
  },
  bookings(id: string, signal?: AbortSignal) {
    return apiRequest<VendorBookingRow[]>({ url: `/vendors/${id}/bookings` }, signal);
  },
  updateBooking(
    vendorId: string,
    vendorBookingId: string,
    data: { status?: string; amount?: number; pax?: number; details?: string },
  ) {
    return apiRequest<VendorBookingRow>({
      method: 'PATCH',
      url: `/vendors/${vendorId}/bookings/${vendorBookingId}`,
      data,
    });
  },
  voucher(vendorId: string, vendorBookingId: string) {
    return apiRequest<VendorVoucher>({
      method: 'POST',
      url: `/vendors/${vendorId}/bookings/${vendorBookingId}/voucher`,
    });
  },
  finance(id: string, signal?: AbortSignal) {
    return apiRequest<VendorFinance>({ url: `/vendors/${id}/finance` }, signal);
  },
};
