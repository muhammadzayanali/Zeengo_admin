import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './guards/RequireAuth';
import { AppShell } from './layouts/AppShell';
import { Skeleton } from '@/shared/ui';

const LoginPage = lazy(() =>
  import('@/modules/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('@/modules/command/dashboard/pages/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
);
const BookingsPage = lazy(() =>
  import('@/modules/clients/bookings/pages/BookingsPage').then((m) => ({
    default: m.BookingsPage,
  })),
);
const BookingDetailPage = lazy(() =>
  import('@/modules/clients/bookings/pages/BookingDetailPage').then((m) => ({
    default: m.BookingDetailPage,
  })),
);
const DailyOpsPage = lazy(() =>
  import('@/modules/command/itineraries/pages/DailyOpsPage').then((m) => ({
    default: m.DailyOpsPage,
  })),
);
const ClientsPage = lazy(() =>
  import('@/modules/clients/pages/ClientsPage').then((m) => ({
    default: m.ClientsPage,
  })),
);
const NewClientPage = lazy(() =>
  import('@/modules/clients/pages/NewClientPage').then((m) => ({
    default: m.NewClientPage,
  })),
);
const ClientDetailPage = lazy(() =>
  import('@/modules/clients/pages/ClientDetailPage').then((m) => ({
    default: m.ClientDetailPage,
  })),
);
const PaymentsPage = lazy(() =>
  import('@/modules/finance/payments/pages/PaymentsPage').then((m) => ({
    default: m.PaymentsPage,
  })),
);
const SplizerPage = lazy(() =>
  import('@/modules/finance/payments/pages/SplizerPage').then((m) => ({
    default: m.SplizerPage,
  })),
);
const FinancePage = lazy(() =>
  import('@/modules/finance/pages/FinancePage').then((m) => ({
    default: m.FinancePage,
  })),
);
const DriversPage = lazy(() =>
  import('@/modules/fleet/drivers/pages/DriversPage').then((m) => ({
    default: m.DriversPage,
  })),
);
const DriverMePage = lazy(() =>
  import('@/modules/fleet/drivers/pages/DriverMePage').then((m) => ({
    default: m.DriverMePage,
  })),
);
const TasksPage = lazy(() =>
  import('@/modules/command/tasks/pages/TasksPage').then((m) => ({
    default: m.TasksPage,
  })),
);
const VendorsPage = lazy(() =>
  import('@/modules/fleet/vendors/pages/VendorsPage').then((m) => ({
    default: m.VendorsPage,
  })),
);
const EditRequestsPage = lazy(() =>
  import('@/modules/clients/edit-requests/pages/EditRequestsPage').then((m) => ({
    default: m.EditRequestsPage,
  })),
);
const VipPage = lazy(() =>
  import('@/modules/clients/vip/pages/VipPage').then((m) => ({ default: m.VipPage })),
);
const SosPage = lazy(() =>
  import('@/modules/command/sos/pages/SosPage').then((m) => ({ default: m.SosPage })),
);
const ChatPage = lazy(() =>
  import('@/modules/tools/chat/pages/ChatPage').then((m) => ({ default: m.ChatPage })),
);
const NotificationsPage = lazy(() =>
  import('@/modules/tools/notifications/pages/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const PackagesPage = lazy(() =>
  import('@/modules/finance/packages/pages/PackagesPage').then((m) => ({
    default: m.PackagesPage,
  })),
);
const UsersPage = lazy(() =>
  import('@/modules/admin/users/pages/UsersPage').then((m) => ({
    default: m.UsersPage,
  })),
);
const SettingsPage = lazy(() =>
  import('@/modules/admin/settings/pages/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  })),
);
const AiPage = lazy(() =>
  import('@/modules/tools/ai/pages/AiPage').then((m) => ({ default: m.AiPage })),
);
const AiParserPage = lazy(() =>
  import('@/modules/tools/ai/pages/AiParserPage').then((m) => ({ default: m.AiParserPage })),
);
const RussiaChatbotPage = lazy(() =>
  import('@/modules/tools/ai/pages/RussiaChatbotPage').then((m) => ({
    default: m.RussiaChatbotPage,
  })),
);
const OperationsRoomPage = lazy(() =>
  import('@/modules/command/ops-room/pages/OperationsRoomPage').then((m) => ({
    default: m.OperationsRoomPage,
  })),
);
const GuidesPage = lazy(() =>
  import('@/modules/fleet/guides/pages/GuidesPage').then((m) => ({ default: m.GuidesPage })),
);
const RolesPage = lazy(() =>
  import('@/modules/admin/roles/pages/RolesPage').then((m) => ({ default: m.RolesPage })),
);
const EmailPage = lazy(() =>
  import('@/modules/tools/email/pages/EmailPage').then((m) => ({ default: m.EmailPage })),
);

function Fallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Fallback />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <L>
            <LoginPage />
          </L>
        }
      />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route
            path="/"
            element={
              <L>
                <DashboardPage />
              </L>
            }
          />
          <Route
            path="/bookings"
            element={
              <L>
                <BookingsPage />
              </L>
            }
          />
          <Route
            path="/bookings/:id"
            element={
              <L>
                <BookingDetailPage />
              </L>
            }
          />
          <Route
            path="/daily-ops"
            element={
              <L>
                <DailyOpsPage />
              </L>
            }
          />
          <Route
            path="/clients"
            element={
              <L>
                <ClientsPage />
              </L>
            }
          />
          <Route
            path="/clients/new"
            element={
              <L>
                <NewClientPage />
              </L>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <L>
                <ClientDetailPage />
              </L>
            }
          />
          <Route
            path="/payments"
            element={
              <L>
                <PaymentsPage />
              </L>
            }
          />
          <Route
            path="/splizer"
            element={
              <L>
                <SplizerPage />
              </L>
            }
          />
          <Route
            path="/finance"
            element={
              <L>
                <FinancePage />
              </L>
            }
          />
          <Route
            path="/drivers"
            element={
              <L>
                <DriversPage />
              </L>
            }
          />
          <Route
            path="/driver/me"
            element={
              <L>
                <DriverMePage />
              </L>
            }
          />
          <Route
            path="/tasks"
            element={
              <L>
                <TasksPage />
              </L>
            }
          />
          <Route
            path="/vendors"
            element={
              <L>
                <VendorsPage />
              </L>
            }
          />
          <Route
            path="/edit-requests"
            element={
              <L>
                <EditRequestsPage />
              </L>
            }
          />
          <Route
            path="/vip"
            element={
              <L>
                <VipPage />
              </L>
            }
          />
          <Route
            path="/sos"
            element={
              <L>
                <SosPage />
              </L>
            }
          />
          <Route
            path="/chat"
            element={
              <L>
                <ChatPage />
              </L>
            }
          />
          <Route
            path="/notifications"
            element={
              <L>
                <NotificationsPage />
              </L>
            }
          />
          <Route
            path="/packages"
            element={
              <L>
                <PackagesPage />
              </L>
            }
          />
          <Route
            path="/users"
            element={
              <L>
                <UsersPage />
              </L>
            }
          />
          <Route
            path="/settings"
            element={
              <L>
                <SettingsPage />
              </L>
            }
          />
          <Route
            path="/ai"
            element={
              <L>
                <AiPage />
              </L>
            }
          />
          <Route
            path="/ai-parser"
            element={
              <L>
                <AiParserPage />
              </L>
            }
          />
          <Route
            path="/russia-chatbot"
            element={
              <L>
                <RussiaChatbotPage />
              </L>
            }
          />
          <Route
            path="/operations-room"
            element={
              <L>
                <OperationsRoomPage />
              </L>
            }
          />
          <Route
            path="/operations"
            element={
              <L>
                <OperationsRoomPage />
              </L>
            }
          />
          <Route
            path="/dashboard"
            element={
              <L>
                <DashboardPage />
              </L>
            }
          />
          <Route
            path="/zeen-rafeq"
            element={
              <L>
                <VipPage />
              </L>
            }
          />
          <Route
            path="/guides"
            element={
              <L>
                <GuidesPage />
              </L>
            }
          />
          <Route
            path="/roles"
            element={
              <L>
                <RolesPage />
              </L>
            }
          />
          <Route
            path="/email"
            element={
              <L>
                <EmailPage />
              </L>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
