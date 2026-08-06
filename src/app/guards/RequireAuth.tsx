import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import type { StaffRole } from '@/shared/api/types';
import { canAccessPath, homeForRole } from '@/modules/auth/permissions';
import { Spinner } from '@/shared/ui';

export function RequireAuth({
  roles,
}: {
  roles?: StaffRole[];
}) {
  const { isAuthenticated, isLoading, hasRole, user, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Checking session…" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !hasRole(...roles)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  if (!canAccessPath(role, location.pathname)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  return <Outlet />;
}
