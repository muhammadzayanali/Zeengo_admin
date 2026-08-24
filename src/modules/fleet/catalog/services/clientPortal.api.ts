import { apiRequest } from '@/shared/api/client';

export type ClientHome = {
  znCode: string;
  clientName: string;
  packageName: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  isVip: boolean;
  balance: { total: number; paid: number; due: number };
  todayProgram: ClientActivity[];
  driver: { name: string; phone: string | null; vehicle: string } | null;
};

export type ClientActivity = {
  id: string;
  dayNumber: number;
  itemDate: string | null;
  startTime: string | null;
  title: string;
  description: string | null;
  locationName: string | null;
  status: string;
  carPlan: string | null;
  meetingPoint: string | null;
  guideContact: string | null;
  pdfUrl: string | null;
  notes: string | null;
  vendorName: string | null;
  vendorType: string | null;
  qrPayload: string;
};

export type ClientItinerary = {
  znCode: string;
  days: Array<{
    dayNumber: number;
    planDate: string | null;
    carPlan: string | null;
    notes: string | null;
    activities: ClientActivity[];
  }>;
};

export const clientPortalApi = {
  znLogin(znCode: string) {
    return apiRequest<{
      accessToken: string;
      refreshToken: string;
      bookingId: string;
      znCode: string;
      user: { id: string; fullName: string; phone: string; preferredLang: string; type: 'client' };
    }>({ method: 'POST', url: '/auth/client/zn-login', data: { znCode } });
  },
  home(signal?: AbortSignal) {
    return apiRequest<ClientHome>({ url: '/client/home' }, signal);
  },
  itinerary(signal?: AbortSignal) {
    return apiRequest<ClientItinerary>({ url: '/client/itinerary' }, signal);
  },
  activity(id: string, signal?: AbortSignal) {
    return apiRequest<ClientActivity>({ url: `/client/activities/${id}` }, signal);
  },
};
