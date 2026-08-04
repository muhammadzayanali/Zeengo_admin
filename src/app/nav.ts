import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Map,
  CalendarCheck,
  Siren,
  CalendarRange,
  Users,
  FilePenLine,
  Crown,
  Car,
  Compass,
  Store,
  Wallet,
  CreditCard,
  Package,
  Split,
  MessageSquare,
  Bell,
  Bot,
  Mail,
  UserCog,
  Shield,
  Settings,
  Route,
} from 'lucide-react';
import type { StaffRole } from '@/shared/api/types';

export type NavItem = {
  to: string;
  labelKey: string;
  roles: StaffRole[];
  icon: LucideIcon;
  end?: boolean;
};

export type NavSection = {
  id: string;
  sectionKey: string;
  items: NavItem[];
};

/**
 * Command Center IA — grouped, iconed, role-gated.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'command',
    sectionKey: 'nav.sections.command',
    items: [
      {
        to: '/',
        labelKey: 'nav.dashboard',
        roles: ['admin', 'ops_manager'],
        icon: LayoutDashboard,
        end: true,
      },
      {
        to: '/operations-room',
        labelKey: 'nav.operationsRoom',
        roles: ['admin', 'ops_manager', 'support'],
        icon: Map,
      },
      {
        to: '/daily-ops',
        labelKey: 'nav.dailyOps',
        roles: ['admin', 'ops_manager', 'support', 'driver'],
        icon: CalendarCheck,
      },
      {
        to: '/sos',
        labelKey: 'nav.sos',
        roles: ['admin', 'ops_manager', 'support', 'splizer', 'driver'],
        icon: Siren,
      },
      {
        to: '/tasks',
        labelKey: 'nav.tasks',
        roles: ['admin', 'ops_manager', 'support'],
        icon: Route,
      },
    ],
  },
  {
    id: 'clients',
    sectionKey: 'nav.sections.clients',
    items: [
      {
        to: '/bookings',
        labelKey: 'nav.bookings',
        roles: ['admin', 'ops_manager', 'support', 'splizer'],
        icon: CalendarRange,
      },
      {
        to: '/clients',
        labelKey: 'nav.clients',
        roles: ['admin', 'ops_manager', 'support', 'splizer', 'driver'],
        icon: Users,
      },
      {
        to: '/edit-requests',
        labelKey: 'nav.editRequests',
        roles: ['admin', 'ops_manager', 'support', 'splizer'],
        icon: FilePenLine,
      },
      {
        to: '/vip',
        labelKey: 'nav.vip',
        roles: ['admin', 'ops_manager', 'support', 'splizer'],
        icon: Crown,
      },
    ],
  },
  {
    id: 'fleet',
    sectionKey: 'nav.sections.fleet',
    items: [
      {
        to: '/drivers',
        labelKey: 'nav.drivers',
        roles: ['admin', 'ops_manager', 'support'],
        icon: Car,
      },
      {
        to: '/guides',
        labelKey: 'nav.guides',
        roles: ['admin', 'ops_manager', 'support'],
        icon: Compass,
      },
      {
        to: '/vendors',
        labelKey: 'nav.vendors',
        roles: ['admin', 'ops_manager', 'support'],
        icon: Store,
      },
      {
        to: '/driver/me',
        labelKey: 'nav.mySchedule',
        roles: ['driver'],
        icon: CalendarCheck,
      },
    ],
  },
  {
    id: 'finance',
    sectionKey: 'nav.sections.finance',
    items: [
      {
        to: '/finance',
        labelKey: 'nav.finance',
        roles: ['admin', 'ops_manager'],
        icon: Wallet,
      },
      {
        to: '/payments',
        labelKey: 'nav.payments',
        roles: ['admin', 'ops_manager', 'splizer'],
        icon: CreditCard,
      },
      {
        to: '/packages',
        labelKey: 'nav.packages',
        roles: ['admin', 'ops_manager'],
        icon: Package,
      },
      {
        to: '/splizer',
        labelKey: 'nav.splizer',
        roles: ['splizer'],
        icon: Split,
      },
    ],
  },
  {
    id: 'tools',
    sectionKey: 'nav.sections.tools',
    items: [
      {
        to: '/chat',
        labelKey: 'nav.chat',
        roles: ['admin', 'ops_manager', 'support', 'splizer', 'driver'],
        icon: MessageSquare,
      },
      {
        to: '/notifications',
        labelKey: 'nav.notifications',
        roles: ['admin', 'ops_manager', 'support', 'splizer', 'driver'],
        icon: Bell,
      },
      {
        to: '/ai',
        labelKey: 'nav.ai',
        roles: ['admin', 'ops_manager', 'support'],
        icon: Bot,
      },
      {
        to: '/email',
        labelKey: 'nav.email',
        roles: ['admin', 'ops_manager', 'support'],
        icon: Mail,
      },
    ],
  },
  {
    id: 'admin',
    sectionKey: 'nav.sections.admin',
    items: [
      {
        to: '/users',
        labelKey: 'nav.users',
        roles: ['admin'],
        icon: UserCog,
      },
      {
        to: '/roles',
        labelKey: 'nav.roles',
        roles: ['admin'],
        icon: Shield,
      },
      {
        to: '/settings',
        labelKey: 'nav.settings',
        roles: ['admin'],
        icon: Settings,
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
