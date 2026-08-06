import { apiRequest } from '@/shared/api/client';
import type { EditRequest, VipClient, VipOverview } from '@/shared/api/types';

export const vipApi = {
  overview(signal?: AbortSignal) {
    return apiRequest<VipOverview>({ url: '/vip/overview' }, signal);
  },
  activate(bookingId: string) {
    return apiRequest<VipClient>({ method: 'POST', url: '/vip/activate', data: { bookingId } });
  },
  requests(signal?: AbortSignal) {
    return apiRequest<EditRequest[]>({ url: '/vip/requests' }, signal);
  },
  clients(signal?: AbortSignal) {
    return apiRequest<VipClient[]>({ url: '/vip/clients' }, signal);
  },
};
