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
  Sparkles,
  Languages,
} from 'lucide-react';
import type { StaffRole } from '@/shared/api/types';
import { ROLE_PERMISSIONS } from '@/features/auth/permissions';

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
 * Sidebar IA + roles from the product RBAC matrix.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'command',
    sectionKey: 'nav.sections.command',
    items: [
      {
        to: '/',
        labelKey: 'nav.dashboard',
        roles: ROLE_PERMISSIONS.dashboard,
        icon: LayoutDashboard,
        end: true,
      },
      {
        to: '/operations-room',
        labelKey: 'nav.operationsRoom',
        roles: ROLE_PERMISSIONS.operationsRoom,
        icon: Map,
      },
      {
        to: '/daily-ops',
        labelKey: 'nav.dailyOps',
        roles: ROLE_PERMISSIONS.dailyOps,
        icon: CalendarCheck,
      },
      {
        to: '/sos',
        labelKey: 'nav.sos',
        roles: ROLE_PERMISSIONS.sos,
        icon: Siren,
      },
      {
        to: '/tasks',
        labelKey: 'nav.tasks',
        roles: ROLE_PERMISSIONS.tasks,
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
        roles: ROLE_PERMISSIONS.bookings,
        icon: CalendarRange,
      },
      {
        to: '/clients',
        labelKey: 'nav.clients',
        roles: ROLE_PERMISSIONS.clients,
        icon: Users,
      },
      {
        to: '/edit-requests',
        labelKey: 'nav.editRequests',
        roles: ROLE_PERMISSIONS.editRequests,
        icon: FilePenLine,
      },
      {
        to: '/vip',
        labelKey: 'nav.vip',
        roles: ROLE_PERMISSIONS.vip,
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
        roles: ['admin', 'ops_manager'] as StaffRole[],
        icon: Car,
      },
      {
        to: '/drivers',
        labelKey: 'nav.driversTerminal',
        roles: ['driver'] as StaffRole[],
        icon: Car,
      },
      {
        to: '/guides',
        labelKey: 'nav.guides',
        roles: ROLE_PERMISSIONS.guides,
        icon: Compass,
      },
      {
        to: '/vendors',
        labelKey: 'nav.vendors',
        roles: ROLE_PERMISSIONS.vendors,
        icon: Store,
      },
      {
        to: '/driver/me',
        labelKey: 'nav.mySchedule',
        roles: ROLE_PERMISSIONS.driverMe,
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
        roles: ROLE_PERMISSIONS.finance,
        icon: Wallet,
      },
      {
        to: '/payments',
        labelKey: 'nav.payments',
        roles: ROLE_PERMISSIONS.payments,
        icon: CreditCard,
      },
      {
        to: '/packages',
        labelKey: 'nav.packages',
        roles: ROLE_PERMISSIONS.packages,
        icon: Package,
      },
      {
        to: '/splizer',
        labelKey: 'nav.splizer',
        roles: ROLE_PERMISSIONS.splizer,
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
        roles: ROLE_PERMISSIONS.teamChat,
        icon: MessageSquare,
      },
      {
        to: '/notifications',
        labelKey: 'nav.notifications',
        roles: ROLE_PERMISSIONS.notifications,
        icon: Bell,
      },
      {
        to: '/ai-parser',
        labelKey: 'nav.aiParser',
        roles: ROLE_PERMISSIONS.aiFeatures,
        icon: Sparkles,
      },
      {
        to: '/russia-chatbot',
        labelKey: 'nav.russiaChatbot',
        roles: ROLE_PERMISSIONS.russiaChatbot,
        icon: Languages,
      },
      {
        to: '/ai',
        labelKey: 'nav.ai',
        roles: ROLE_PERMISSIONS.aiFeatures,
        icon: Bot,
      },
      {
        to: '/email',
        labelKey: 'nav.email',
        roles: ROLE_PERMISSIONS.email,
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
        roles: ROLE_PERMISSIONS.users,
        icon: UserCog,
      },
      {
        to: '/roles',
        labelKey: 'nav.roles',
        roles: ROLE_PERMISSIONS.settings,
        icon: Shield,
      },
      {
        to: '/settings',
        labelKey: 'nav.settings',
        roles: ROLE_PERMISSIONS.settings,
        icon: Settings,
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
