import { apiRequest } from '@/shared/api/client';
import type { Package } from '@/shared/api/types';

export interface PackageInput {
  name: string;
  slug?: string;
  pricePerPerson: number;
  minPersons?: number;
  durationDays?: number;
  description?: string;
  inclusions?: string[];
}

export const packagesApi = {
  list(signal?: AbortSignal) {
    return apiRequest<Package[]>({ url: '/packages' }, signal);
  },
  create(data: PackageInput) {
    return apiRequest<Package>({ method: 'POST', url: '/packages', data });
  },
  update(id: string, data: Partial<PackageInput>) {
    return apiRequest<Package>({ method: 'PATCH', url: `/packages/${id}`, data });
  },
  remove(id: string) {
    return apiRequest<Package>({ method: 'DELETE', url: `/packages/${id}` });
  },
};
