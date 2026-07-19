/**
 * ProtectedRoute – Authentication Guard
 *
 * Sits between the router and every authenticated page. Single
 * enforcement point for access control on the client:
 *  • isLoading        → renders a full-screen spinner while the session
 *                        is being validated (prevents flash of login page)
 *  • !isAuthenticated  → redirects to /login preserving the originally
 *                        requested URL in `state.from` for post-login redirect
 *  • isAuthenticated   → renders the child routes via <Outlet />
 */

import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { Loader } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading, loadCurrentUser } = useAuthStore();

  useEffect(() => {
    loadCurrentUser();
    // Only ever needs to run once per mount — loadCurrentUser is a stable
    // zustand action reference and re-running it on every render would
    // re-trigger the session check in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session validation in progress – avoid flash of login page
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--sf-surface-base)]">
        <Loader size="lg" label="Verifying session…" />
      </div>
    );
  }

  // Not authenticated – redirect to login, preserving intended destination
  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ from: location }}
        replace
      />
    );
  }

  // Authenticated – render the requested route
  return <Outlet />;
}
