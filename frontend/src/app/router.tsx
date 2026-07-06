import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AuthLayout }      from '@/layouts/AuthLayout';
import { Loader }          from '@/components/ui';
import { NotFoundPage }    from '@/pages/NotFoundPage';

// ─── Lazy-loaded page modules ──────────────────────────────────────
const LoginPage          = lazy(() => import('@/features/authentication/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage      = lazy(() => import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LiveMonitoringPage = lazy(() => import('@/features/live-monitoring/pages/LiveMonitoringPage').then((m) => ({ default: m.LiveMonitoringPage })));
const AlertsPage         = lazy(() => import('@/features/alerts/pages/AlertsPage').then((m) => ({ default: m.AlertsPage })));
const ReportsPage        = lazy(() => import('@/features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AnalyticsPage      = lazy(() => import('@/features/analytics/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const SettingsPage       = lazy(() => import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

// ─── Suspense fallback ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center h-full min-h-[60vh]">
      <Loader size="lg" label="Loading…" />
    </div>
  );
}

// ─── Router definition ─────────────────────────────────────────────
const router = createBrowserRouter([
  // Redirect root → dashboard
  {
    path: ROUTES.HOME,
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },

  // Auth pages
  {
    element: <AuthLayout />,
    children: [
      {
        path: ROUTES.LOGIN,
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },

  // App pages (with Sidebar + TopNav)
  {
    element: <DashboardLayout />,
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: ROUTES.LIVE_MONITORING,
        element: (
          <Suspense fallback={<PageLoader />}>
            <LiveMonitoringPage />
          </Suspense>
        ),
      },
      {
        path: ROUTES.ALERTS,
        element: (
          <Suspense fallback={<PageLoader />}>
            <AlertsPage />
          </Suspense>
        ),
      },
      {
        path: ROUTES.REPORTS,
        element: (
          <Suspense fallback={<PageLoader />}>
            <ReportsPage />
          </Suspense>
        ),
      },
      {
        path: ROUTES.ANALYTICS,
        element: (
          <Suspense fallback={<PageLoader />}>
            <AnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: ROUTES.SETTINGS,
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
    ],
  },

  // 404
  {
    path: ROUTES.NOT_FOUND,
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
