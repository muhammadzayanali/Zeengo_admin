import { apiList, apiRequest, toQuery } from '@/shared/api/client';

export type OpsClientCard = {
  bookingId: string;
  znCode: string;
  clientName: string;
  clientPhone: string;
  packageName: string | null;
  status: string;
  arrivalDate: string | null;
  departureDate: string | null;
  partySize: number;
  pendingItems: number;
  totalItems: number;
  notConfirmedTitles: string[];
  coordinatorName: string | null;
  driverName: string | null;
  assignmentStatus: string | null;
  createdAt: string;
};

export type OpsActivity = {
  id: string;
  dayNumber: number;
  itemDate: string | null;
  startTime: string | null;
  title: string;
  locationName: string | null;
  status: string;
  carPlan: string | null;
  meetingPoint: string | null;
  guideContact: string | null;
  pdfUrl: string | null;
  notes: string | null;
  vendorId: string | null;
  vendorName: string | null;
  vendorType: string | null;
  qrPayload: string;
};

export type OpsDay = {
  dayNumber: number;
  planDate: string | null;
  carPlan: string | null;
  notes: string | null;
  notConfirmed: string[];
  activities: OpsActivity[];
};

export type OpsStaffLink = {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  createdAt: string;
};

export type OpsBookingDetail = {
  bookingId: string;
  znCode: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  nationality: string | null;
  packageName: string | null;
  status: string;
  arrivalDate: string | null;
  departureDate: string | null;
  partySize: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  internalNotes: string | null;
  days: OpsDay[];
  staff: OpsStaffLink[];
  driverName: string | null;
  driverPhone: string | null;
  assignmentStatus: string | null;
  checklist: Array<{ id: string; title: string; isDone: boolean }>;
  editRequests: Array<{
    id: string;
    type: string;
    status: string;
    reason: string | null;
    createdAt: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
  }>;
};

export const operationsApi = {
  clients(params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return apiList<OpsClientCard>(
      { url: '/operations/clients', params: toQuery(params) },
      signal,
    );
  },
  urgent(signal?: AbortSignal) {
    return apiRequest<
      Array<{
        id: string;
        bookingId: string;
        znCode: string;
        clientName: string;
        title: string;
        status: string;
        itemDate: string | null;
        startTime: string | null;
      }>
    >({ url: '/operations/urgent' }, signal);
  },
  booking(id: string, signal?: AbortSignal) {
    return apiRequest<OpsBookingDetail>({ url: `/operations/bookings/${id}` }, signal);
  },
  upsertDayPlan(
    bookingId: string,
    data: { dayNumber: number; planDate?: string; carPlan?: string; notes?: string },
  ) {
    return apiRequest({
      method: 'POST',
      url: `/operations/bookings/${bookingId}/day-plan`,
      data,
    });
  },
  updateItem(
    itemId: string,
    data: Partial<{
      status: string;
      carPlan: string | null;
      meetingPoint: string | null;
      guideContact: string | null;
      pdfUrl: string | null;
      notes: string | null;
      title: string;
      locationName: string | null;
    }>,
  ) {
    return apiRequest<OpsActivity>({
      method: 'PATCH',
      url: `/operations/items/${itemId}`,
      data,
    });
  },
  addStaff(bookingId: string, data: { staffId: string; role: string }) {
    return apiRequest<OpsStaffLink>({
      method: 'POST',
      url: `/operations/bookings/${bookingId}/staff`,
      data,
    });
  },
  removeStaff(linkId: string) {
    return apiRequest({ method: 'DELETE', url: `/operations/staff-links/${linkId}` });
  },
};
