import { apiList, apiRequest, toQuery } from '@/shared/api/client';
import type {
  DailyOperationItem,
  DriverAssignment,
  DriverDetail,
  DriverDutyStatus,
  DriverListItem,
  DriverReview,
  DriverReviewsStats,
  DriverSchedule,
  DriverStats,
  DriverTrip,
  LivePosition,
  UnassignedBooking,
} from '@/shared/api/types';

export const driverKeys = {
  all: ['drivers'] as const,
  list: (params?: Record<string, string | number | undefined>) =>
    [...driverKeys.all, 'list', params ?? {}] as const,
  stats: () => [...driverKeys.all, 'stats'] as const,
  unassigned: () => [...driverKeys.all, 'unassigned'] as const,
  detail: (id: string) => [...driverKeys.all, 'detail', id] as const,
  schedule: (id: string, date?: string) =>
    [...driverKeys.all, 'schedule', id, date ?? 'today'] as const,
  trips: (id: string) => [...driverKeys.all, 'trips', id] as const,
  me: () => [...driverKeys.all, 'me'] as const,
  mySchedule: (date?: string) => [...driverKeys.all, 'me-schedule', date ?? 'today'] as const,
  reviews: (id: string) => [...driverKeys.all, 'reviews', id] as const,
  myReviews: () => [...driverKeys.all, 'me-reviews'] as const,
  reviewStats: (id?: string) => [...driverKeys.all, 'review-stats', id ?? 'me'] as const,
};

export const driversApi = {
  list(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<DriverListItem>({ url: '/drivers', params: toQuery(params) }, signal);
  },
  stats(signal?: AbortSignal) {
    return apiRequest<DriverStats>({ url: '/drivers/stats' }, signal);
  },
  unassignedBookings(signal?: AbortSignal) {
    return apiRequest<UnassignedBooking[]>({ url: '/drivers/unassigned-bookings' }, signal);
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
    return apiRequest<DriverSchedule>(
      { url: `/drivers/${id}/schedule`, params: toQuery({ date }) },
      signal,
    );
  },
  trips(id: string, signal?: AbortSignal) {
    return apiRequest<DriverTrip[]>({ url: `/drivers/${id}/trips` }, signal);
  },
  assign(data: { bookingId: string; driverId: string; startDate?: string; endDate?: string }) {
    return apiRequest<DriverAssignment>({
      method: 'POST',
      url: '/drivers/assignments',
      data,
    });
  },
  unassign(id: string) {
    return apiRequest({ method: 'DELETE', url: `/drivers/assignments/${id}` });
  },
  me(signal?: AbortSignal) {
    return apiRequest<DriverDetail>({ url: '/drivers/me' }, signal);
  },
  mySchedule(date?: string, signal?: AbortSignal) {
    return apiRequest<DriverSchedule>(
      { url: '/drivers/me/schedule', params: toQuery({ date }) },
      signal,
    );
  },
  updateMyVehicle(data: {
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor?: string;
    vehicleYear?: number;
    plateNumber: string;
    whatsapp?: string;
  }) {
    return apiRequest<DriverListItem>({
      method: 'PATCH',
      url: '/drivers/me/vehicle',
      data,
    });
  },
  reviews(id: string, signal?: AbortSignal) {
    return apiList<DriverReview>(
      { url: `/drivers/${id}/reviews`, params: toQuery({ limit: 20 }) },
      signal,
    );
  },
  myReviews(signal?: AbortSignal) {
    return apiList<DriverReview>(
      { url: '/drivers/me/reviews', params: toQuery({ limit: 20 }) },
      signal,
    );
  },
  reviewStats(driverId?: string, signal?: AbortSignal) {
    return apiRequest<DriverReviewsStats>(
      { url: '/reviews/stats', params: toQuery({ driverId }) },
      signal,
    );
  },
  myStatus(status: DriverDutyStatus | string) {
    return apiRequest<DriverListItem>({
      method: 'PUT',
      url: '/drivers/me/status',
      data: { status },
    });
  },
  updateMyScheduleItem(itemId: string, status: string) {
    return apiRequest<DailyOperationItem>({
      method: 'PATCH',
      url: `/drivers/me/schedule/${itemId}`,
      data: { status },
    });
  },
  myGps(lat: number, lng: number) {
    return apiRequest({ method: 'POST', url: '/drivers/me/gps', data: { lat, lng } });
  },
  acceptAssignment(id: string) {
    return apiRequest<DriverAssignment>({
      method: 'POST',
      url: `/drivers/me/assignments/${id}/accept`,
    });
  },
  rejectAssignment(id: string, reason: string) {
    return apiRequest<DriverAssignment>({
      method: 'POST',
      url: `/drivers/me/assignments/${id}/reject`,
      data: { reason },
    });
  },
  startAssignment(id: string) {
    return apiRequest<DriverAssignment>({
      method: 'POST',
      url: `/drivers/me/assignments/${id}/start`,
    });
  },
  completeAssignment(id: string) {
    return apiRequest<DriverAssignment>({
      method: 'POST',
      url: `/drivers/me/assignments/${id}/complete`,
    });
  },
};
