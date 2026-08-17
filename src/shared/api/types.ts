export type StaffRole =
  | 'admin'
  | 'ops_manager'
  | 'splizer'
  | 'support'
  | 'driver';

export type BookingStatus = 'active' | 'completed' | 'cancelled';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: StaffUser;
}

export interface DashboardSummary {
  activeClients: number;
  urgentTasks: number;
  driversInField: number;
  revenueToday: number;
  todaysItinerary: number;
  itineraryProgress?: number;
  unassignedClients: number;
  opsQueue: number;
  activeSos?: number;
  pendingEdits?: number;
}

export interface UrgentAlert {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  entityId: string | null;
  createdAt: string;
  znCode?: string | null;
  clientName?: string | null;
}

export interface DashboardUnassignedClient {
  bookingId: string;
  znCode: string;
  clientName: string;
  packageName: string | null;
  arrivalDate: string | null;
}

export interface DashboardDriverCard {
  id: string;
  fullName: string;
  phone: string | null;
  status: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  plateNumber: string | null;
  rating: number;
  activeAssignmentZn: string | null;
}

export interface DashboardOverview {
  summary: DashboardSummary;
  alerts: UrgentAlert[];
  unassigned: DashboardUnassignedClient[];
  drivers: DashboardDriverCard[];
  generatedAt: string;
  cacheTtlSeconds: number;
}

export interface Booking {
  id: string;
  znCode: string;
  clientId: string;
  packageId: string;
  arrivalDate: string | null;
  departureDate: string | null;
  partySize: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: BookingStatus;
  isVip: boolean;
  internalNotes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    nationality: string | null;
  };
  package?: { id: string; name: string; slug: string };
  activeDriverAssignment?: {
    id: string;
    driverId: string;
    driverName: string | null;
    startDate: string;
    endDate: string | null;
    status: string;
  } | null;
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  nationality: string | null;
  whatsapp: string | null;
  preferredLang: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: string;
  name: string;
  slug: string;
  pricePerPerson: number;
  minPersons: number;
  durationDays: number | null;
  description: string | null;
  inclusions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  status: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  booking?: { id: string; znCode: string };
}

export interface Driver {
  id: string;
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string | null;
  status: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  plateNumber: string | null;
  rating?: string | number;
  tripsCount?: number;
  lastLat?: number | null;
  lastLng?: number | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'urgent' | 'normal';
  status: 'open' | 'done';
  bookingId: string | null;
  znCode?: string | null;
  assigneeId: string | null;
  assigneeName?: string | null;
  dueDate: string | null;
  createdAt: string;
}

export type VendorType =
  | 'hotel'
  | 'restaurant'
  | 'guide'
  | 'bus'
  | 'activity'
  | 'driver';

export type VendorPaymentTerms = 'bank_transfer' | 'cash' | 'voucher';

export type VendorBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface Vendor {
  id: string;
  name: string;
  type: VendorType | string;
  city: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  commissionPct: number | null;
  paymentTerms?: string | null;
  cancellationPolicy?: string | null;
  notes?: string | null;
  isActive: boolean;
  activeBookingsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorBookingRow {
  id: string;
  vendorId: string;
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
  status: VendorBookingStatus | string;
  createdAt: string;
}

export interface VendorDetail extends Vendor {
  finance: VendorFinance;
  bookings: VendorBookingRow[];
}

export interface VendorStats {
  total: number;
  hotel: number;
  restaurant: number;
  guide: number;
  bus: number;
  activity: number;
  driver: number;
}

export interface VendorVoucher {
  vendorBookingId: string;
  voucherCode: string;
  vendorName: string;
  vendorEmail: string | null;
  znCode: string;
  clientName: string;
  serviceDate: string | null;
  pax: number | null;
  details: string | null;
  email: { to: string | null; subject: string; body: string };
}

export interface EditRequest {
  id: string;
  bookingId: string;
  znCode?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  originalValue: string | null;
  requestedValue: string | null;
  reason: string | null;
  reviewNotes?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  targetDate?: string | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
  createdAt: string;
}

export interface SosAlert {
  id: string;
  bookingId: string | null;
  znCode?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  message: string | null;
  status: 'active' | 'resolved';
  lat: number | null;
  lng: number | null;
  resolvedBy?: string | null;
  resolvedByName?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: string;
  title: string | null;
  bookingId: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  body: string;
  createdAt: string;
  senderType?: string;
  senderName?: string | null;
  senderStaffId?: string | null;
  senderClientId?: string | null;
  bodyTranslated?: Record<string, string>;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ItineraryItem {
  id: string;
  bookingId: string;
  dayNumber: number;
  title: string;
  itemDate: string | null;
  startTime: string | null;
  description: string | null;
  locationName: string | null;
  lat?: number | null;
  lng?: number | null;
  vendorId?: string | null;
  driverId?: string | null;
  status: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyOperationItem extends ItineraryItem {
  znCode: string;
  clientName: string;
  driverName?: string | null;
}

export interface DailyOperationsDay {
  date: string;
  itemCount: number;
  pendingCount: number;
  activeCount: number;
  doneCount: number;
  items: DailyOperationItem[];
}

export interface ChecklistItem {
  id: string;
  bookingId: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
}

export interface BookingNote {
  id: string;
  bookingId: string;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}

export interface BookingStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  revenueTotal: number;
}

export interface EodReport {
  id: string;
  reportDate: string;
  content: string;
  generatedBy: string;
  sentAt: string | null;
  createdAt: string;
}

export interface FinanceSummary {
  today: {
    stripe: { amount: number; count: number };
    cash: { amount: number; count: number };
  };
  pending: { amount: number; count: number };
}

export interface RevenueByMethod {
  days: number;
  total: number;
  byMethod: Array<{ method: string; amount: number; count: number }>;
}

export interface PaymentHistoryItem extends Payment {
  znCode: string;
  clientName: string;
  collectedByName?: string | null;
  stripeLinkUrl?: string | null;
  linkExpiresAt?: string | null;
}

export interface SplizerClient {
  id: string;
  znCode: string;
  clientName: string;
  clientPhone: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  arrivalDate: string | null;
}

export interface DriverUserSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

export type DriverDutyStatus = 'available' | 'en_route' | 'resting' | 'off_duty';

export interface DriverActiveAssignment {
  id: string;
  bookingId: string;
  znCode: string | null;
  clientName: string | null;
  clientPhone: string | null;
  startDate: string;
  endDate: string | null;
}

export interface DriverListItem {
  id: string;
  userId: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehicleYear: number | null;
  plateNumber: string | null;
  whatsapp: string | null;
  rating: string;
  reviewsCount: number;
  tripsCount: number;
  status: DriverDutyStatus | string;
  lastLat: number | null;
  lastLng: number | null;
  lastGpsAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: DriverUserSummary;
  activeAssignment?: DriverActiveAssignment | null;
}

export interface DriverDetail extends DriverListItem {
  assignments: DriverAssignment[];
}

export interface DriverAssignment {
  id: string;
  bookingId: string;
  znCode: string | null;
  clientName: string | null;
  clientPhone?: string | null;
  driverId: string;
  startDate: string;
  endDate: string | null;
  status: string;
  assignedBy: string;
  createdAt: string;
}

export interface UnassignedBooking {
  bookingId: string;
  znCode: string;
  clientName: string;
  clientPhone: string | null;
  packageName: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  isVip: boolean;
}

export interface DriverStats {
  total: number;
  available: number;
  enRoute: number;
  resting: number;
  offDuty: number;
  unassignedBookings: number;
}

export interface DriverTrip {
  id: string;
  bookingId: string;
  znCode: string;
  clientName: string;
  startDate: string;
  endDate: string | null;
  status: string;
}

export interface LivePosition {
  driverId: string;
  driverName: string;
  lat: number;
  lng: number;
  status: string;
  recordedAt: string;
}

export interface DriverSchedule {
  date: string;
  items: DailyOperationItem[];
}

export interface DriverReview {
  id: string;
  bookingId: string;
  znCode: string;
  clientId: string;
  clientName: string;
  driverId: string;
  driverName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverReviewsStats {
  driverId: string | null;
  average: number;
  reviewsCount: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface VendorFinance {
  vendorId: string;
  vendorName: string;
  totalBookings: number;
  totalAmount: number;
  totalCommission: number;
  pendingAmount: number;
  completedAmount: number;
}

export interface VipOpsManager {
  id: string;
  fullName: string;
  phone: string | null;
  email: string;
}

export interface VipOverview {
  totalVipBookings: number;
  pendingUpgradeRequests: number;
  vipRevenue: number;
  vipPrice: number;
  hotline: string;
  slaMinutes: number;
  inclusions: string[];
  opsManagers?: VipOpsManager[];
}

export interface VipClient {
  bookingId: string;
  znCode: string;
  clientId: string;
  clientName: string;
  clientPhone?: string | null;
  packageName?: string | null;
  hotelName?: string | null;
  specialNotes?: string | null;
  isVip: boolean;
  isAssigned?: boolean;
  driverName?: string | null;
  vipActivatedAt: string | null;
  totalAmount: number;
  status?: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  preferredLang?: string | null;
}

export interface VipCandidate {
  bookingId: string;
  znCode: string;
  clientName: string;
  packageName: string | null;
  totalAmount: number;
}

export interface VipClientFile extends VipClient {
  notes: Array<{
    id: string;
    body: string;
    authorName: string | null;
    createdAt: string;
  }>;
}

export interface VipEscalateResult {
  bookingId: string;
  znCode: string;
  taskId: string | null;
  conversationId: string | null;
  notified: boolean;
}

export interface Setting {
  key: string;
  value: unknown;
  updatedBy: string | null;
  updatedAt: string;
}

export interface StaffStats {
  total: number;
  byRole: Record<string, number>;
}

export interface ClientThread extends Conversation {
  clientName: string | null;
}

export interface ParsedItineraryDay {
  dayNumber: number;
  items: Array<{
    time?: string;
    title: string;
    description?: string;
    locationName?: string;
  }>;
}

export interface ParseItineraryResult {
  days: ParsedItineraryDay[];
  parser: 'heuristic' | 'claude';
}

export interface ChatbotResult {
  sessionId: string;
  reply: string;
  source: 'stub' | 'claude';
}

export interface EmailDraftResult {
  subject: string;
  body: string;
  source: 'stub' | 'claude';
}

export interface AiEodReportResult {
  reportDate: string;
  content: string;
  summary: Record<string, number>;
  source: 'stub' | 'claude';
}

export type EmailTemplateId =
  | 'booking_confirmation'
  | 'itinerary_change'
  | 'sos_followup'
  | 'invoice_receipt';

export interface EmailTemplate {
  id: EmailTemplateId | string;
  name: string;
}

export interface EmailRecipient {
  bookingId: string;
  znCode: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  packageName: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  isVip: boolean;
  status: string;
}

export interface EmailPreview {
  to: string | null;
  toName: string;
  template: string;
  templateName: string;
  subject: string;
  body: string;
  bookingId: string;
  znCode: string;
}

export interface EmailLogItem {
  id: string;
  bookingId: string | null;
  znCode: string | null;
  toEmail: string;
  toName: string | null;
  template: string;
  templateName: string;
  subject: string;
  body: string;
  status: string;
  error: string | null;
  sentByName: string | null;
  createdAt: string;
}
