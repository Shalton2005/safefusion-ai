/**
 * ProtectedRoute – Authentication Guard
 *
 * Sits between the router and every authenticated page. Single
 * enforcement point for access control on the client:
 *  • isLoading                    → renders a full-screen spinner while the
 *                                    session is being validated (prevents
 *                                    flash of login page)
 *  • error && !isAuthenticated    → the session check failed transiently
 *                                    (network/timeout/server error, not a
 *                                    rejected token — see `useAuthStore`)
 *                                    with no prior session to fall back on;
 *                                    shows a retriable error instead of
 *                                    bouncing to /login, so a brief backend
 *                                    outage doesn't force a re-login
 *  • !isAuthenticated              → redirects to /login preserving the
 *                                    originally requested URL in
 *                                    `state.from` for post-login redirect
 *  • isAuthenticated               → renders the child routes via <Outlet />
 */

import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RotateCw } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { Alert, Button, Loader } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading, error, loadCurrentUser } = useAuthStore();

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

  // Session check failed transiently and there's no prior session to keep
  // showing — offer a retry instead of forcing the user back through login.
  if (error && !isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--sf-surface-base)] p-4">
        <Alert
          variant="danger"
          title="Couldn't verify your session"
          actions={
            <Button size="sm" variant="outline" onClick={loadCurrentUser} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
              Retry
            </Button>
          }
          className="max-w-md"
        >
          {error}
        </Alert>
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
