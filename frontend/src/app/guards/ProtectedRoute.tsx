/**
 * ProtectedRoute – Authentication Guard (Placeholder)
 *
 * This component sits between the router and every authenticated page.
 * It acts as the single enforcement point for access control.
 *
 * ─── CURRENT STATE ──────────────────────────────────────────────────
 * Authentication is NOT implemented.  `isAuthenticated` is always
 * `true` so every route is freely accessible during development.
 *
 * ─── HOW TO ACTIVATE AUTH ───────────────────────────────────────────
 * When the auth service is ready:
 *   1. Import the auth store:
 *        import { useAuthStore } from '@/store/useAuthStore';
 *   2. Replace the placeholder constants below:
 *        const { isAuthenticated, isLoading } = useAuthStore();
 *   3. Done — this component handles the rest.
 *
 * ─── WHAT THIS COMPONENT DOES ───────────────────────────────────────
 *  • isLoading  → renders a full-screen spinner while the session
 *                  is being validated (prevents flash of login page)
 *  • !isAuthenticated → redirects to /login preserving the originally
 *                  requested URL in `state.from` for post-login redirect
 *  • isAuthenticated  → renders the child routes via <Outlet />
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { Loader } from '@/components/ui';

export function ProtectedRoute() {
  const location = useLocation();

  // ── AUTH PLACEHOLDER ─────────────────────────────────────────────
  // Replace these two constants with your auth store selectors:
  //   const { isAuthenticated, isLoading } = useAuthStore();
  const isAuthenticated = true;  // TODO: wire to auth store
  const isLoading       = false; // TODO: wire to auth store
  // ─────────────────────────────────────────────────────────────────

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
