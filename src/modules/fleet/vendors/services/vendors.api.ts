import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type { Vendor, VendorFinance } from '@/shared/api/types';

export interface CreateVendorInput {
  name: string;
  type: string;
  city?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  commissionPct?: number;
  notes?: string;
}

export interface UpdateVendorInput extends Partial<CreateVendorInput> {
  isActive?: boolean;
}

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
  create(data: CreateVendorInput) {
    return apiRequest<Vendor>({ method: 'POST', url: '/vendors', data });
  },
  update(id: string, data: UpdateVendorInput) {
    return apiRequest<Vendor>({ method: 'PATCH', url: `/vendors/${id}`, data });
  },
  remove(id: string) {
    return apiRequest<Vendor>({ method: 'DELETE', url: `/vendors/${id}` });
  },
  assign(id: string, data: { bookingId: string; itineraryItemId?: string; amount?: number }) {
    return apiRequest({ method: 'POST', url: `/vendors/${id}/assign`, data });
  },
  finance(id: string, signal?: AbortSignal) {
    return apiRequest<VendorFinance>({ url: `/vendors/${id}/finance` }, signal);
  },
};
