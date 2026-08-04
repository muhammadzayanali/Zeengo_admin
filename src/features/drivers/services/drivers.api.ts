import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type {
  DriverAssignment,
  DriverDetail,
  DriverListItem,
  DriverSchedule,
  DriverTrip,
  LivePosition,
} from '@/shared/api/types';

export const driversApi = {
  list(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<DriverListItem>({ url: '/drivers', params: toQuery(params) }, signal);
  },
  livePositions(signal?: AbortSignal) {
    return apiRequest<LivePosition[]>({ url: '/drivers/live-positions' }, signal);
  },
  get(id: string, signal?: AbortSignal) {
    return apiRequest<DriverDetail>({ url: `/drivers/${id}` }, signal);
  },
  update(id: string, data: Record<string, unknown>) {
    return apiRequest<DriverListItem>({ method: 'PATCH', url: `/drivers/${id}`, data });
  },
  schedule(id: string, date?: string, signal?: AbortSignal) {
    return apiRequest<DriverSchedule>({ url: `/drivers/${id}/schedule`, params: toQuery({ date }) }, signal);
  },
  trips(id: string, signal?: AbortSignal) {
    return apiRequest<DriverTrip[]>({ url: `/drivers/${id}/trips` }, signal);
  },
  assign(data: Record<string, unknown>) {
    return apiRequest<DriverAssignment>({ method: 'POST', url: '/drivers/assignments', data });
  },
  unassign(id: string) {
    return apiRequest({ method: 'DELETE', url: `/drivers/assignments/${id}` });
  },
  mySchedule(date?: string, signal?: AbortSignal) {
    return apiRequest<DriverSchedule>({ url: '/drivers/me/schedule', params: toQuery({ date }) }, signal);
  },
  myStatus(status: string) {
    return apiRequest({ method: 'PUT', url: '/drivers/me/status', data: { status } });
  },
  myGps(lat: number, lng: number) {
    return apiRequest({ method: 'POST', url: '/drivers/me/gps', data: { lat, lng } });
  },
};
