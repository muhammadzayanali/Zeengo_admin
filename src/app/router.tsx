import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './guards/RequireAuth';
import { AppShell } from './layouts/AppShell';
import { Skeleton } from '@/shared/ui';

const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
);
const BookingsPage = lazy(() =>
  import('@/features/bookings/pages/BookingsPage').then((m) => ({
    default: m.BookingsPage,
  })),
);
const BookingDetailPage = lazy(() =>
  import('@/features/bookings/pages/BookingDetailPage').then((m) => ({
    default: m.BookingDetailPage,
  })),
);
const DailyOpsPage = lazy(() =>
  import('@/features/itineraries/pages/DailyOpsPage').then((m) => ({
    default: m.DailyOpsPage,
  })),
);
const ClientsPage = lazy(() =>
  import('@/features/clients/pages/ClientsPage').then((m) => ({
    default: m.ClientsPage,
  })),
);
const PaymentsPage = lazy(() =>
  import('@/features/payments/pages/PaymentsPage').then((m) => ({
    default: m.PaymentsPage,
  })),
);
const SplizerPage = lazy(() =>
  import('@/features/payments/pages/SplizerPage').then((m) => ({
    default: m.SplizerPage,
  })),
);
const FinancePage = lazy(() =>
  import('@/features/finance/pages/FinancePage').then((m) => ({
    default: m.FinancePage,
  })),
);
const DriversPage = lazy(() =>
  import('@/features/drivers/pages/DriversPage').then((m) => ({
    default: m.DriversPage,
  })),
);
const DriverMePage = lazy(() =>
  import('@/features/drivers/pages/DriverMePage').then((m) => ({
    default: m.DriverMePage,
  })),
);
const TasksPage = lazy(() =>
  import('@/features/tasks/pages/TasksPage').then((m) => ({
    default: m.TasksPage,
  })),
);
const VendorsPage = lazy(() =>
  import('@/features/vendors/pages/VendorsPage').then((m) => ({
    default: m.VendorsPage,
  })),
);
const EditRequestsPage = lazy(() =>
  import('@/features/edit-requests/pages/EditRequestsPage').then((m) => ({
    default: m.EditRequestsPage,
  })),
);
const VipPage = lazy(() =>
  import('@/features/vip/pages/VipPage').then((m) => ({ default: m.VipPage })),
);
const SosPage = lazy(() =>
  import('@/features/sos/pages/SosPage').then((m) => ({ default: m.SosPage })),
);
const ChatPage = lazy(() =>
  import('@/features/chat/pages/ChatPage').then((m) => ({ default: m.ChatPage })),
);
const NotificationsPage = lazy(() =>
  import('@/features/notifications/pages/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const PackagesPage = lazy(() =>
  import('@/features/packages/pages/PackagesPage').then((m) => ({
    default: m.PackagesPage,
  })),
);
const UsersPage = lazy(() =>
  import('@/features/users/pages/UsersPage').then((m) => ({
    default: m.UsersPage,
  })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  })),
);
const AiPage = lazy(() =>
  import('@/features/ai/pages/AiPage').then((m) => ({ default: m.AiPage })),
);
const OperationsRoomPage = lazy(() =>
  import('@/features/stubs/pages/StubPages').then((m) => ({
    default: m.OperationsRoomPage,
  })),
);
const GuidesPage = lazy(() =>
  import('@/features/stubs/pages/StubPages').then((m) => ({ default: m.GuidesPage })),
);
const RolesPage = lazy(() =>
  import('@/features/stubs/pages/StubPages').then((m) => ({ default: m.RolesPage })),
);
const EmailPage = lazy(() =>
  import('@/features/stubs/pages/StubPages').then((m) => ({ default: m.EmailPage })),
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
            path="/operations-room"
            element={
              <L>
                <OperationsRoomPage />
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
