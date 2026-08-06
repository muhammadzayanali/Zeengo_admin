/** Frontend-only ops demo store. Swap these services for real API later. */
export type OpsDriverStatus = 'AVAILABLE' | 'EN_ROUTE' | 'RESTING' | 'OFF_DUTY';
export type OpsTaskStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';
export type OpsSosStatus = 'active' | 'resolved';
export type EditReqStatus = 'pending' | 'approved' | 'rejected';

export type OpsDriver = {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
  status: OpsDriverStatus;
  rating: number;
  assignmentId: string | null;
  lat: number;
  lng: number;
  speedKmh: number;
  etaMin: number | null;
  trafficDelay: number;
  passengerName: string | null;
};

export type OpsClient = {
  id: string;
  znCode: string;
  fullName: string;
  phone: string;
  email: string;
  nationality: string;
  partySize: number;
  language: 'ar' | 'en' | 'ru';
  packageName: string;
  driverId: string | null;
  tripStart: string;
  tripEnd: string;
  status: 'active' | 'suspended' | 'completed';
  isVip: boolean;
  medicalNotes: string;
  emergencyContact: string;
  passportMasked: string;
  hotel: string;
  dietary: string;
  totalSpent: number;
  outstanding: number;
  notes: string;
  segment: string;
  tier: string;
};

export type OpsSos = {
  id: string;
  clientId: string;
  status: OpsSosStatus;
  triggeredAt: string;
  lat: number;
  lng: number;
  phoneAttempt: boolean | null;
  driverDispatchedId: string | null;
  emergencyService: string | null;
  notes: string;
  resolvedAt: string | null;
  responseMinutes: number | null;
};

export type OpsTask = {
  id: string;
  title: string;
  clientId: string;
  driverId: string | null;
  timeBlock: 'morning' | 'afternoon' | 'evening';
  location: string;
  vendorStatus: 'pending' | 'confirmed' | 'fulfilled';
  serviceType: 'airport_pickup' | 'hotel_checkin' | 'guided_tour' | 'transfer';
  status: OpsTaskStatus;
  done: boolean;
};

export type OpsEditRequest = {
  id: string;
  clientId: string;
  type: string;
  original: string;
  requested: string;
  createdAt: string;
  availability: 'available' | 'conflict' | 'checking';
  status: EditReqStatus;
};

export type OpsVendor = {
  id: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  email: string;
  tier: string;
  activeOrders: number;
  rating: number;
};

export type OpsPackage = {
  id: string;
  name: string;
  priceUsd: number;
  priceSar: number;
  inclusions: string[];
  driverHours: number;
  vipConcierge: boolean;
  validityDays: number;
};

export type OpsStaff = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: string;
};

function delay(ms = 200) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

const listeners = new Set<() => void>();
let opsVersion = 0;

export function subscribeOps(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getOpsVersion() {
  return opsVersion;
}

function emit() {
  opsVersion += 1;
  listeners.forEach((fn) => fn());
}

export let drivers: OpsDriver[] = [
  {
    id: 'drv_alexei',
    name: 'Alexei Sokolov',
    phone: '+7 916 100 2001',
    vehicle: 'Mercedes V-Class',
    plate: 'A123BC77',
    status: 'AVAILABLE',
    rating: 4.9,
    assignmentId: null,
    lat: 55.7558,
    lng: 37.6173,
    speedKmh: 0,
    etaMin: null,
    trafficDelay: 0,
    passengerName: null,
  },
  {
    id: 'drv_dmitri',
    name: 'Dmitri Volkov',
    phone: '+7 916 100 2002',
    vehicle: 'Toyota Alphard',
    plate: 'B456DE77',
    status: 'EN_ROUTE',
    rating: 4.7,
    assignmentId: 'ASN-1042',
    lat: 55.7512,
    lng: 37.6185,
    speedKmh: 42,
    etaMin: 14,
    trafficDelay: 6,
    passengerName: 'ahmed',
  },
  {
    id: 'drv_ivan',
    name: 'Ivan Petrov',
    phone: '+7 916 100 2003',
    vehicle: 'Cadillac Escalade',
    plate: 'C789FG77',
    status: 'RESTING',
    rating: 4.8,
    assignmentId: null,
    lat: 55.7601,
    lng: 37.625,
    speedKmh: 0,
    etaMin: null,
    trafficDelay: 0,
    passengerName: null,
  },
];

const clientBase = {
  medicalNotes: '',
  emergencyContact: '',
  passportMasked: 'P••••0000',
  hotel: '—',
  dietary: '',
  notes: '',
  segment: '',
  tier: '',
  partySize: 2,
  nationality: 'Saudi Arabia',
} satisfies Partial<OpsClient>;

export let clients: OpsClient[] = [
  { ...clientBase, id: 'cli_01', znCode: 'ZN0001', fullName: 'ch Salman', phone: '+966 50 111 0001', email: 'salman@example.com', language: 'ar', packageName: 'Royal Package', driverId: 'drv_alexei', tripStart: '2026-08-03', tripEnd: '2026-08-10', status: 'active', isVip: true, medicalNotes: 'None', emergencyContact: '+966 50 999 0001', passportMasked: 'P••••1001', hotel: 'Four Seasons Moscow', dietary: 'Halal', totalSpent: 12500, outstanding: 3200, partySize: 4, nationality: 'Saudi Arabia', notes: 'VIP desk priority' },
  { ...clientBase, id: 'cli_02', znCode: 'ZN0002', fullName: 'فهد الشمري', phone: '+966 50 111 0002', email: 'fahd@example.com', language: 'ar', packageName: 'Royal Package', driverId: null, tripStart: '2026-08-04', tripEnd: '2026-08-12', status: 'active', isVip: true, medicalNotes: 'Mild hypertension — avoid long waits', emergencyContact: '+966 50 999 0002 (brother)', passportMasked: 'P••••1002', hotel: 'Ararat Park Hyatt', dietary: 'No shellfish', totalSpent: 9800, outstanding: 1750, partySize: 3, nationality: 'Saudi Arabia' },
  { ...clientBase, id: 'cli_03', znCode: 'ZN0003', fullName: 'ahmed', phone: '+966 50 111 0003', email: 'ahmed@example.com', language: 'en', packageName: 'Family Package', driverId: 'drv_dmitri', tripStart: '2026-08-04', tripEnd: '2026-08-08', status: 'active', isVip: false, medicalNotes: '', emergencyContact: '+966 50 999 0003', passportMasked: 'P••••1003', hotel: 'Metropol', dietary: 'Child meal', totalSpent: 4200, outstanding: 900, partySize: 5, nationality: 'UAE' },
  { ...clientBase, id: 'cli_04', znCode: 'ZN0004', fullName: 'Khalid bin Saeed', phone: '+966 50 111 0004', email: 'khalid@example.com', language: 'ar', packageName: 'Royal Package', driverId: null, tripStart: '2026-08-05', tripEnd: '2026-08-11', status: 'active', isVip: true, passportMasked: 'P••••1004', hotel: 'Ritz Moscow', totalSpent: 15000, outstanding: 0, partySize: 2, nationality: 'Saudi Arabia' },
  { ...clientBase, id: 'cli_05', znCode: 'ZN0005', fullName: 'Maria Ivanova', phone: '+7 903 200 3005', email: 'maria@example.com', language: 'ru', packageName: 'City Express', driverId: 'drv_ivan', tripStart: '2026-08-04', tripEnd: '2026-08-06', status: 'active', isVip: false, passportMasked: 'P••••2005', hotel: 'Cosmos', totalSpent: 1100, outstanding: 200, partySize: 1, nationality: 'Russia' },
  { ...clientBase, id: 'cli_06', znCode: 'ZN0006', fullName: 'Yousef Al-Harbi', phone: '+966 50 111 0006', email: 'yousef@example.com', language: 'ar', packageName: 'City Express', driverId: null, tripStart: '2026-08-04', tripEnd: '2026-08-07', status: 'active', isVip: false, passportMasked: 'P••••1006', hotel: 'Ibis', totalSpent: 800, outstanding: 0, partySize: 2, nationality: 'Saudi Arabia' },
  { ...clientBase, id: 'cli_07', znCode: 'ZN0007', fullName: 'ريم الغامدي', phone: '+966 50 111 0007', email: 'reem.g@example.com', language: 'ar', packageName: 'Family Package', driverId: null, tripStart: '2026-08-04', tripEnd: '2026-08-09', status: 'active', isVip: true, medicalNotes: 'Peanut allergy', emergencyContact: '+966 50 999 0007', passportMasked: 'P••••1007', hotel: 'Four Seasons', dietary: 'No peanuts', totalSpent: 5600, outstanding: 1400, partySize: 3, nationality: 'Saudi Arabia' },
  { ...clientBase, id: 'cli_08', znCode: 'ZN0008', fullName: 'Hassan Al-Dosari', phone: '+966 50 111 0008', email: 'hassan@example.com', language: 'en', packageName: 'City Express', driverId: null, tripStart: '2026-07-01', tripEnd: '2026-07-05', status: 'completed', isVip: false, passportMasked: 'P••••1008', totalSpent: 900, outstanding: 0, partySize: 1, nationality: 'Saudi Arabia' },
  { ...clientBase, id: 'cli_09', znCode: 'ZN0009', fullName: 'Elena Smirnova', phone: '+7 903 200 3009', email: 'elena@example.com', language: 'ru', packageName: 'Family Package', driverId: null, tripStart: '2026-08-04', tripEnd: '2026-08-08', status: 'active', isVip: false, passportMasked: 'P••••2009', hotel: 'National', totalSpent: 2100, outstanding: 400, partySize: 2, nationality: 'Russia' },
  { ...clientBase, id: 'cli_10', znCode: 'ZN0010', fullName: 'Turki Al-Ghamdi', phone: '+966 50 111 0010', email: 'turki@example.com', language: 'ar', packageName: 'Royal Package', driverId: 'drv_alexei', tripStart: '2026-08-04', tripEnd: '2026-08-14', status: 'active', isVip: true, emergencyContact: '+966 50 999 0010', passportMasked: 'P••••1010', hotel: 'St. Regis', dietary: 'Halal', totalSpent: 22000, outstanding: 0, partySize: 4, nationality: 'Saudi Arabia' },
  { ...clientBase, id: 'cli_11', znCode: 'ZN0011', fullName: 'Reem Al-Zahrani', phone: '+966 50 111 0011', email: 'reem@example.com', language: 'ar', packageName: 'City Express', driverId: null, tripStart: '2026-08-04', tripEnd: '2026-08-05', status: 'active', isVip: false, passportMasked: 'P••••1011', hotel: 'Hilton', totalSpent: 450, outstanding: 0, partySize: 1, nationality: 'Saudi Arabia' },
];

const sosAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export let sosAlerts: OpsSos[] = [
  { id: 'sos_01', clientId: 'cli_02', status: 'active', triggeredAt: sosAgo(12), lat: 55.7539, lng: 37.6208, phoneAttempt: null, driverDispatchedId: null, emergencyService: null, notes: '', resolvedAt: null, responseMinutes: null },
  { id: 'sos_02', clientId: 'cli_04', status: 'active', triggeredAt: sosAgo(45), lat: 55.7415, lng: 37.601, phoneAttempt: null, driverDispatchedId: null, emergencyService: null, notes: 'No driver assigned at trigger', resolvedAt: null, responseMinutes: null },
  { id: 'sos_03', clientId: 'cli_01', status: 'resolved', triggeredAt: sosAgo(1400), lat: 55.75, lng: 37.62, phoneAttempt: true, driverDispatchedId: 'drv_alexei', emergencyService: null, notes: 'False alarm — client pocket dial', resolvedAt: sosAgo(1380), responseMinutes: 18 },
];

export let tasks: OpsTask[] = [
  { id: 'tk_01', title: 'SVO Airport Arrival', clientId: 'cli_01', driverId: 'drv_alexei', timeBlock: 'morning', location: 'SVO T-D', vendorStatus: 'confirmed', serviceType: 'airport_pickup', status: 'completed', done: true },
  { id: 'tk_02', title: 'Hotel Check-In', clientId: 'cli_03', driverId: 'drv_dmitri', timeBlock: 'morning', location: 'Metropol', vendorStatus: 'confirmed', serviceType: 'hotel_checkin', status: 'in_progress', done: false },
  { id: 'tk_03', title: 'Kremlin Private Tour', clientId: 'cli_02', driverId: null, timeBlock: 'afternoon', location: 'Red Square', vendorStatus: 'pending', serviceType: 'guided_tour', status: 'delayed', done: false },
  { id: 'tk_04', title: 'Hotel Transfer', clientId: 'cli_04', driverId: null, timeBlock: 'afternoon', location: 'Ritz Moscow', vendorStatus: 'pending', serviceType: 'transfer', status: 'delayed', done: false },
  { id: 'tk_05', title: 'Museum Guided Visit', clientId: 'cli_09', driverId: null, timeBlock: 'afternoon', location: 'Tretyakov', vendorStatus: 'pending', serviceType: 'guided_tour', status: 'pending', done: false },
  { id: 'tk_06', title: 'Airport Evening Pickup', clientId: 'cli_06', driverId: null, timeBlock: 'evening', location: 'DME', vendorStatus: 'pending', serviceType: 'airport_pickup', status: 'pending', done: false },
  { id: 'tk_07', title: 'VIP Dinner Transfer', clientId: 'cli_07', driverId: null, timeBlock: 'evening', location: 'White Rabbit', vendorStatus: 'confirmed', serviceType: 'transfer', status: 'pending', done: false },
  { id: 'tk_08', title: 'Hotel Drop-off', clientId: 'cli_11', driverId: null, timeBlock: 'evening', location: 'Hilton', vendorStatus: 'pending', serviceType: 'transfer', status: 'delayed', done: false },
  { id: 'tk_09', title: 'City Tour AM', clientId: 'cli_10', driverId: 'drv_alexei', timeBlock: 'morning', location: 'Center', vendorStatus: 'fulfilled', serviceType: 'guided_tour', status: 'completed', done: true },
  { id: 'tk_10', title: 'Shopping Escort', clientId: 'cli_05', driverId: 'drv_ivan', timeBlock: 'afternoon', location: 'GUM', vendorStatus: 'confirmed', serviceType: 'transfer', status: 'pending', done: false },
];

export let editRequests: OpsEditRequest[] = [
  { id: 'er_01', clientId: 'cli_02', type: 'Date change', original: 'Trip start 2026-08-04 09:00', requested: 'Trip start 2026-08-06 10:00', createdAt: sosAgo(180), availability: 'available', status: 'pending' },
  { id: 'er_02', clientId: 'cli_07', type: 'Hotel change', original: 'Four Seasons Moscow', requested: 'St. Regis Moscow', createdAt: sosAgo(90), availability: 'conflict', status: 'pending' },
  { id: 'er_03', clientId: 'cli_03', type: 'Flight delay', original: 'Pickup 11:00', requested: 'Pickup 14:30', createdAt: sosAgo(40), availability: 'checking', status: 'pending' },
];

export let vendors: OpsVendor[] = [
  { id: 'v1', name: 'Four Seasons Moscow', category: 'hotel', contact: 'VIP Desk', phone: '+7 495 100 1100', email: 'vip@fs-msk.example', tier: 'Preferred', activeOrders: 3, rating: 4.9 },
  { id: 'v2', name: 'NordStar Transfers', category: 'transport', contact: 'Ops Desk', phone: '+7 495 100 2200', email: 'ops@nordstar.example', tier: 'SLA 30m', activeOrders: 5, rating: 4.6 },
  { id: 'v3', name: 'Red Square Guides', category: 'excursion', contact: 'Bookings', phone: '+7 495 100 3300', email: 'book@rsg.example', tier: 'Standard', activeOrders: 2, rating: 4.8 },
  { id: 'v4', name: 'MedEvac Rapid', category: 'emergency', contact: '24h Desk', phone: '+7 495 100 4400', email: '24h@medevac.example', tier: 'On-call', activeOrders: 0, rating: 5.0 },
  { id: 'v5', name: 'Ararat Park Hyatt', category: 'hotel', contact: 'Concierge', phone: '+7 495 100 5500', email: 'concierge@aph.example', tier: 'Preferred', activeOrders: 1, rating: 4.7 },
];

export let packages: OpsPackage[] = [
  { id: 'pkg_gold', name: 'Gold VIP Transfer', priceUsd: 890, priceSar: 3330, inclusions: ['Private SUV', 'Meet & greet', 'Water & wifi'], driverHours: 4, vipConcierge: true, validityDays: 7 },
  { id: 'pkg_exec', name: '7-Day Executive Tour', priceUsd: 12500, priceSar: 46800, inclusions: ['SUV fleet', 'Bilingual guide', 'VIP hotel desk', '24/7 line'], driverHours: 56, vipConcierge: true, validityDays: 14 },
  { id: 'pkg_airport', name: 'Standard Airport Pickup', priceUsd: 120, priceSar: 450, inclusions: ['Sedan', 'Flight tracking'], driverHours: 2, vipConcierge: false, validityDays: 2 },
];

export let staff: OpsStaff[] = [
  { id: 'st_01', name: 'Fatima Al-Rashidi', email: 'fatima@zeengo.com', phone: '+966 50 200 0001', role: 'Ops Mgr', status: 'active', lastLogin: 'Today, 13:45' },
  { id: 'st_02', name: 'Sara Hassan', email: 'sara@zeengo.com', phone: '+966 50 200 0002', role: 'Support', status: 'active', lastLogin: 'Today, 11:20' },
  { id: 'st_03', name: 'Dmitri Volkov', email: 'dmitri@zeengo.com', phone: '+7 916 100 2002', role: 'Driver', status: 'active', lastLogin: 'Yesterday' },
  { id: 'st_04', name: 'Amine Lahouideg', email: 'admin@zeengo.com', phone: '+966 50 200 0003', role: 'Admin', status: 'active', lastLogin: 'Today, 14:00' },
  { id: 'st_05', name: 'Omar Hassan', email: 'finance@zeengo.com', phone: '+966 50 200 0004', role: 'Splizer', status: 'active', lastLogin: 'Today, 09:10' },
];

export type VendorOrder = { id: string; vendorId: string; title: string; status: 'sent' | 'accepted' | 'fulfilled' };
export let vendorOrders: VendorOrder[] = [
  { id: 'vo_1', vendorId: 'v1', title: 'Suite hold ZN0002', status: 'accepted' },
  { id: 'vo_2', vendorId: 'v3', title: 'Kremlin tour ZN0002', status: 'sent' },
];

export type ChatChannel = { id: string; name: string; type: 'channel' | 'dm' };
export type ChatMessage = { id: string; channelId: string; author: string; body: string; at: string; pinned?: boolean };
export let channels: ChatChannel[] = [
  { id: 'ch_gen', name: '#general', type: 'channel' },
  { id: 'ch_disp', name: '#dispatch', type: 'channel' },
  { id: 'ch_sos', name: '#emergency-sos', type: 'channel' },
  { id: 'dm_1', name: 'DM · Fatima', type: 'dm' },
];
export let messages: ChatMessage[] = [
  { id: 'm1', channelId: 'ch_disp', author: 'Fatima', body: 'ZN0002 unassigned — need AVAILABLE driver for afternoon tour.', at: sosAgo(30) },
  { id: 'm2', channelId: 'ch_sos', author: 'System', body: 'SOS opened for فهد الشمري (ZN0002).', at: sosAgo(12), pinned: true },
  { id: 'm3', channelId: 'ch_gen', author: 'Sara', body: 'EOD draft ready after 18:00.', at: sosAgo(60) },
];

export type RussiaSession = {
  id: string;
  clientName: string;
  intent: string;
  sentiment: number;
  confidence: number;
  autoReply: boolean;
  status: 'bot' | 'escalated' | 'closed';
  lastMessage: string;
};
export let russiaSessions: RussiaSession[] = [
  { id: 'rs_1', clientName: 'Maria Ivanova', intent: 'transfer_change', sentiment: 0.4, confidence: 0.91, autoReply: true, status: 'bot', lastMessage: 'Можно перенести трансфер на 16:00?' },
  { id: 'rs_2', clientName: 'Elena Smirnova', intent: 'hotel_question', sentiment: 0.7, confidence: 0.78, autoReply: true, status: 'bot', lastMessage: 'Есть ли поздний check-out?' },
  { id: 'rs_3', clientName: 'Unknown', intent: 'emergency_keyword', sentiment: 0.1, confidence: 0.52, autoReply: false, status: 'escalated', lastMessage: 'Нужна помощь срочно' },
];

export type EmailLog = { id: string; to: string; template: string; status: 'sent' | 'delivered' | 'opened' | 'bounced'; at: string };
export let emailLogs: EmailLog[] = [
  { id: 'em_1', to: 'fahd@example.com', template: 'Itinerary confirmation', status: 'opened', at: sosAgo(200) },
  { id: 'em_2', to: 'noura@example.com', template: 'Invoice receipt', status: 'delivered', at: sosAgo(100) },
  { id: 'em_3', to: 'turki@example.com', template: 'SOS follow-up', status: 'sent', at: sosAgo(20) },
];

export type OpsPayment = {
  id: string;
  clientId: string;
  amount: number;
  method: 'cash' | 'stripe';
  note: string;
  at: string;
  stripeUrl?: string;
  recordedBy: string;
};
export let payments: OpsPayment[] = [
  {
    id: 'pay_1',
    clientId: 'cli_01',
    amount: 2500,
    method: 'stripe',
    note: 'Deposit — Royal Package',
    at: sosAgo(400),
    stripeUrl: 'https://pay.stripe.com/demo/zn0001',
    recordedBy: 'Omar Hassan',
  },
  {
    id: 'pay_2',
    clientId: 'cli_03',
    amount: 800,
    method: 'cash',
    note: 'On-ground collection Metropol lobby',
    at: sosAgo(120),
    recordedBy: 'Omar Hassan',
  },
];

/** Demo logged-in field driver (driver@zeengo.com maps here) */
export const DEMO_DRIVER_ID = 'drv_dmitri';

export const emailTemplates = [
  { id: 'tpl_itinerary', name: 'Booking Confirmations' },
  { id: 'tpl_change', name: 'Itinerary Changes' },
  { id: 'tpl_sos', name: 'SOS Follow-ups' },
  { id: 'tpl_invoice', name: 'Invoice Receipts' },
];

export type RbaceMatrix = Record<string, Record<string, boolean>>;
export let rbac: RbaceMatrix = {
  Dashboard: { Admin: true, 'Ops Mgr': true, Splizer: false, Driver: false, Support: false },
  'Operations Room': { Admin: true, 'Ops Mgr': true, Splizer: false, Driver: false, Support: false },
  'SOS Alerts': { Admin: true, 'Ops Mgr': true, Splizer: false, Driver: false, Support: true },
  'Clients (full)': { Admin: true, 'Ops Mgr': true, Splizer: false, Driver: false, Support: true },
  Drivers: { Admin: true, 'Ops Mgr': true, Splizer: false, Driver: true, Support: false },
  Splizer: { Admin: true, 'Ops Mgr': true, Splizer: true, Driver: false, Support: false },
  Finance: { Admin: true, 'Ops Mgr': true, Splizer: false, Driver: false, Support: false },
  Settings: { Admin: true, 'Ops Mgr': false, Splizer: false, Driver: false, Support: false },
};

export let aiModels: Record<string, string> = {
  sos: 'Claude Opus 4.6',
  parser: 'Claude Sonnet 4.6',
  chatbot: 'Claude Haiku 4.5',
  email: 'Claude Sonnet 4.6',
  summary: 'Claude Haiku 4.5',
};

export let apiKeys: Record<string, boolean> = {
  anthropic: false,
  stripe: false,
  maps: false,
  firebase: false,
  s3: false,
};

// ——— queries / mutations ———
export function getClient(id: string) {
  return clients.find((c) => c.id === id) ?? null;
}
export function getClientByCode(zn: string) {
  return clients.find((c) => c.znCode === zn) ?? null;
}
export function getDriver(id: string) {
  return drivers.find((d) => d.id === id) ?? null;
}

export function computeKpis() {
  const activeClients = clients.filter((c) => c.status === 'active').length;
  const unassigned = clients.filter((c) => c.status === 'active' && !c.driverId).length;
  const driversInField = drivers.filter((d) => d.status === 'EN_ROUTE').length;
  const urgentTasks = tasks.filter((t) => t.status === 'delayed' && !t.done).length;
  const completed = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const activeSos = sosAlerts.filter((s) => s.status === 'active').length;
  const pendingEdits = editRequests.filter((e) => e.status === 'pending').length;
  const overdue = tasks.filter((t) => t.status === 'delayed').length;
  return {
    activeClients,
    unassigned,
    driversInField,
    urgentTasks,
    revenueToday: 0,
    itineraryProgress: progress,
    activeSos,
    pendingEdits,
    overdue,
    opsQueue: overdue + urgentTasks,
  };
}

export async function toggleTaskDone(id: string) {
  await delay();
  const t = tasks.find((x) => x.id === id);
  if (!t) return null;
  t.done = !t.done;
  t.status = t.done ? 'completed' : 'pending';
  emit();
  return t;
}

export async function assignDriverToClient(clientId: string, driverId: string | null) {
  await delay();
  const c = clients.find((x) => x.id === clientId);
  if (!c) throw new Error('Not found');

  // Clear previous driver assignment on this client
  if (c.driverId) {
    const prev = drivers.find((x) => x.id === c.driverId);
    if (prev && prev.passengerName === c.fullName) {
      prev.assignmentId = null;
      prev.passengerName = null;
      prev.etaMin = null;
      if (prev.status === 'EN_ROUTE') prev.status = 'AVAILABLE';
    }
  }

  if (!driverId) {
    c.driverId = null;
    emit();
    return { client: c, driver: null };
  }

  const d = drivers.find((x) => x.id === driverId);
  if (!d) throw new Error('Driver not found');
  c.driverId = driverId;
  d.status = 'EN_ROUTE';
  d.assignmentId = `ASN-${Math.floor(Math.random() * 9000 + 1000)}`;
  d.passengerName = c.fullName;
  d.etaMin = 18;
  emit();
  return { client: c, driver: d };
}

export type CreateClientInput = {
  fullName: string;
  phone?: string;
  email?: string;
  nationality?: string;
  partySize?: number;
  packageName?: string;
  tripStart?: string;
  tripEnd?: string;
  totalAmount?: number;
  notes?: string;
};

function nextZnCode() {
  const nums = clients
    .map((c) => Number(c.znCode.replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `ZN${String(next).padStart(4, '0')}`;
}

export async function createClient(input: CreateClientInput) {
  await delay();
  const total = Math.max(0, Number(input.totalAmount) || 0);
  const row: OpsClient = {
    id: `cli_${Date.now()}`,
    znCode: nextZnCode(),
    fullName: input.fullName.trim(),
    phone: (input.phone || '').trim(),
    email: (input.email || '').trim(),
    nationality: (input.nationality || '').trim() || '—',
    partySize: Math.max(1, Number(input.partySize) || 1),
    language: 'en',
    packageName: (input.packageName || '').trim() || '—',
    driverId: null,
    tripStart: input.tripStart || new Date().toISOString().slice(0, 10),
    tripEnd: input.tripEnd || new Date().toISOString().slice(0, 10),
    status: 'active',
    isVip: false,
    medicalNotes: '',
    emergencyContact: '',
    passportMasked: 'P••••••••',
    hotel: '—',
    dietary: '',
    totalSpent: 0,
    outstanding: total,
    notes: (input.notes || '').trim(),
    segment: '',
    tier: '',
  };
  clients = [row, ...clients];
  emit();
  return row;
}

export type UpdateClientInput = Partial<
  Pick<
    OpsClient,
    | 'fullName'
    | 'phone'
    | 'email'
    | 'nationality'
    | 'partySize'
    | 'packageName'
    | 'driverId'
    | 'tripStart'
    | 'tripEnd'
    | 'status'
    | 'totalSpent'
    | 'outstanding'
    | 'notes'
    | 'language'
    | 'segment'
    | 'tier'
    | 'hotel'
    | 'medicalNotes'
    | 'dietary'
  >
>;

export async function updateClient(id: string, patch: UpdateClientInput) {
  await delay();
  const c = clients.find((x) => x.id === id);
  if (!c) throw new Error('Client not found');
  const { driverId, ...rest } = patch;
  Object.assign(c, rest);
  if (driverId !== undefined) {
    // keep driver side-effects in sync when set via edit form
    await assignDriverToClient(id, driverId);
    return getClient(id)!;
  }
  emit();
  return c;
}

export async function createClientTask(
  clientId: string,
  input: { title: string; priority?: 'normal' | 'urgent'; dueDate?: string },
) {
  await delay();
  const c = getClient(clientId);
  if (!c) throw new Error('Client not found');
  const title = input.title.trim();
  if (!title) throw new Error('Title required');
  const hour = new Date().getHours();
  const timeBlock: OpsTask['timeBlock'] =
    hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const row: OpsTask = {
    id: `tk_${Date.now()}`,
    title: input.priority === 'urgent' ? `⚠ ${title}` : title,
    clientId,
    driverId: c.driverId,
    timeBlock,
    location: c.hotel || '—',
    vendorStatus: 'pending',
    serviceType: 'transfer',
    status: input.priority === 'urgent' ? 'delayed' : 'pending',
    done: false,
  };
  tasks = [row, ...tasks];
  emit();
  return row;
}

export async function updateDriverStatus(id: string, status: OpsDriverStatus) {
  await delay();
  const d = drivers.find((x) => x.id === id);
  if (!d) throw new Error('Not found');
  d.status = status;
  if (status === 'AVAILABLE') {
    d.assignmentId = null;
    d.passengerName = null;
    d.speedKmh = 0;
  }
  emit();
  return d;
}

export async function resolveSos(
  id: string,
  payload: { phoneAttempt: boolean; driverDispatchedId: string | null; emergencyService: string | null; notes: string },
) {
  await delay();
  const s = sosAlerts.find((x) => x.id === id);
  if (!s) throw new Error('Not found');
  s.status = 'resolved';
  s.phoneAttempt = payload.phoneAttempt;
  s.driverDispatchedId = payload.driverDispatchedId;
  s.emergencyService = payload.emergencyService;
  s.notes = payload.notes;
  s.resolvedAt = new Date().toISOString();
  s.responseMinutes = Math.round((Date.now() - new Date(s.triggeredAt).getTime()) / 60_000);
  emit();
  return s;
}

export async function approveEdit(id: string) {
  await delay();
  const er = editRequests.find((x) => x.id === id);
  if (!er) throw new Error('Not found');
  er.status = 'approved';
  const c = getClient(er.clientId);
  if (c && er.type.toLowerCase().includes('date')) {
    c.tripStart = '2026-08-06';
  }
  emit();
  return er;
}

export async function rejectEdit(id: string) {
  await delay();
  const er = editRequests.find((x) => x.id === id);
  if (!er) throw new Error('Not found');
  er.status = 'rejected';
  emit();
  return er;
}

export async function collectCash(clientId: string, amount: number, note: string) {
  await delay();
  const c = clients.find((x) => x.id === clientId);
  if (!c) throw new Error('Client not found');
  const pay: OpsPayment = {
    id: `pay_${Date.now()}`,
    clientId,
    amount,
    method: 'cash',
    note: note || 'Cash collection',
    at: new Date().toISOString(),
    recordedBy: 'Splizer',
  };
  payments = [pay, ...payments];
  c.totalSpent += amount;
  c.outstanding = Math.max(0, c.outstanding - amount);
  emit();
  return pay;
}

export async function createStripeLink(clientId: string, amount: number) {
  await delay();
  const c = clients.find((x) => x.id === clientId);
  if (!c) throw new Error('Client not found');
  const url = `https://pay.stripe.com/demo/${c.znCode.toLowerCase()}-${Date.now().toString(36)}`;
  const pay: OpsPayment = {
    id: `pay_${Date.now()}`,
    clientId,
    amount,
    method: 'stripe',
    note: `Stripe link generated · ${c.packageName}`,
    at: new Date().toISOString(),
    stripeUrl: url,
    recordedBy: 'Splizer',
  };
  payments = [pay, ...payments];
  emit();
  return pay;
}

export async function setTaskStatus(id: string, status: OpsTaskStatus) {
  await delay();
  const t = tasks.find((x) => x.id === id);
  if (!t) return null;
  t.status = status;
  t.done = status === 'completed';
  emit();
  return t;
}

export async function addChatMessage(channelId: string, body: string, author = 'You') {
  await delay(100);
  const m: ChatMessage = {
    id: `m_${Date.now()}`,
    channelId,
    author,
    body,
    at: new Date().toISOString(),
  };
  messages = [...messages, m];
  emit();
  return m;
}

export async function sendEmailLog(to: string, template: string) {
  await delay();
  const row: EmailLog = {
    id: `em_${Date.now()}`,
    to,
    template,
    status: 'sent',
    at: new Date().toISOString(),
  };
  emailLogs = [row, ...emailLogs];
  emit();
  return row;
}

export async function saveStaff(row: OpsStaff) {
  await delay();
  const i = staff.findIndex((s) => s.id === row.id);
  if (i >= 0) staff[i] = row;
  else staff = [row, ...staff];
  emit();
  return row;
}

export async function upsertPackage(pkg: OpsPackage) {
  await delay();
  const i = packages.findIndex((p) => p.id === pkg.id);
  if (i >= 0) packages[i] = pkg;
  else packages = [pkg, ...packages];
  emit();
  return pkg;
}

export async function createVendorOrder(vendorId: string, title: string) {
  await delay();
  const row: VendorOrder = {
    id: `vo_${Date.now()}`,
    vendorId,
    title,
    status: 'sent',
  };
  vendorOrders = [row, ...vendorOrders];
  const v = vendors.find((x) => x.id === vendorId);
  if (v) v.activeOrders += 1;
  emit();
  return row;
}

export async function toggleRbac(feature: string, role: string) {
  await delay(50);
  if (!rbac[feature]) return;
  rbac[feature][role] = !rbac[feature][role];
  emit();
  return rbac;
}

export async function setApiKeyConfigured(key: string, value: boolean) {
  await delay(50);
  apiKeys = { ...apiKeys, [key]: value };
  emit();
  return apiKeys;
}

export async function setAiModel(slot: string, model: string) {
  await delay(50);
  aiModels = { ...aiModels, [slot]: model };
  emit();
  return aiModels;
}

export async function escalateRussia(id: string) {
  await delay();
  const s = russiaSessions.find((x) => x.id === id);
  if (!s) throw new Error('Not found');
  s.status = 'escalated';
  s.autoReply = false;
  emit();
  return s;
}

export async function toggleRussiaAuto(id: string) {
  await delay(50);
  const s = russiaSessions.find((x) => x.id === id);
  if (!s) throw new Error('Not found');
  s.autoReply = !s.autoReply;
  emit();
  return s;
}

export function mockParseText(raw: string) {
  const flight = raw.match(/\b([A-Z]{2}\d{2,4})\b/);
  const name = raw.match(/(?:Mr\.?|Ms\.?|client)[:\s]+([A-Za-z\u0600-\u06FF ]{3,40})/i);
  const hotel = raw.match(/(?:hotel|stay)[:\s]+([A-Za-z0-9 \-]{3,40})/i);
  return {
    client_name: name?.[1]?.trim() || 'Amine Lahouideg',
    flight_number: flight?.[1] || 'SV124',
    arrival_timestamp: '2026-08-04T18:30:00Z',
    pickup_location: 'RUH Airport Terminal 5',
    hotel_destination: hotel?.[1]?.trim() || 'Ritz-Carlton Riyadh',
  };
}

export function generateEodText() {
  const k = computeKpis();
  return [
    'ZEENGO End of Day Report',
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `Active clients: ${k.activeClients}`,
    `Itinerary progress: ${k.itineraryProgress}%`,
    `Drivers in field: ${k.driversInField}`,
    `Unassigned clients: ${k.unassigned}`,
    `Active SOS: ${k.activeSos}`,
    `Pending edit requests: ${k.pendingEdits}`,
    '',
    'Resolved emergencies: ' + sosAlerts.filter((s) => s.status === 'resolved').length,
    'Completed tasks: ' + tasks.filter((t) => t.done).length,
    '',
    '— Generated by Ops Agent (mock Claude summary) —',
  ].join('\n');
}

export function nudgeDrivers() {
  drivers = drivers.map((d) => {
    if (d.status !== 'EN_ROUTE') return d;
    const j = () => (Math.random() - 0.5) * 0.002;
    return { ...d, lat: d.lat + j(), lng: d.lng + j(), speedKmh: 35 + Math.floor(Math.random() * 20) };
  });
  emit();
}

export function elapsedLabel(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}
