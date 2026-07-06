/**
 * Application Router
 *
 * Builds the React Router data-router from the modular route definitions
 * in src/app/routes/.  This file owns the layout composition tree —
 * route metadata and lazy components live in appRoutes / authRoutes.
 *
 * Layout hierarchy
 * ────────────────────────────────────────────────────────────────────
 *   AppLayout          (global singletons: toasts, portals)
 *   ├── /              → redirect → /dashboard
 *   ├── AuthLayout     (centred card, no sidebar)
 *   │   └── /login    → LoginPage
 *   ├── ProtectedRoute (auth guard placeholder)
 *   │   └── DashboardLayout (sidebar + topnav + footer)
 *   │       ├── /dashboard
 *   │       ├── /live-monitoring
 *   │       ├── /alerts
 *   │       ├── /reports
 *   │       ├── /analytics
 *   │       └── /settings
 *   └── *              → NotFoundPage
 */

import { Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';

import { ROUTES }          from '@/constants/routes';
import { AppLayout }       from '@/layouts/AppLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AuthLayout }      from '@/layouts/AuthLayout';
import { ProtectedRoute }  from '@/app/guards/ProtectedRoute';
import { NotFoundPage }    from '@/pages/NotFoundPage';
import { Loader }          from '@/components/ui';

import { routePartitions }        from './routes';
import type { AppRouteDefinition } from './routes/types';

// ─── Suspense fallback ────────────────────────────────────────────

function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="flex flex-1 items-center justify-center min-h-[60vh]"
    >
      <Loader size="lg" label="Loading…" />
    </div>
  );
}

// ─── Route builder helper ─────────────────────────────────────────

/**
 * Converts an AppRouteDefinition into a React Router RouteObject,
 * wrapping the lazy component in a Suspense boundary.
 */
function toRouteObject(def: AppRouteDefinition) {
  const PageComponent: LazyExoticComponent<ComponentType> = def.component;

  return {
    path: def.path,
    element: (
      <Suspense fallback={<PageLoader />}>
        <PageComponent />
      </Suspense>
    ),
  };
}

// ─── Router instance ──────────────────────────────────────────────

const router = createBrowserRouter([
  {
    // Root path — wraps every route in AppLayout (toasts, portals)
    path:    '/',
    element: <AppLayout />,
    children: [
      // ── Root redirect ──────────────────────────────────────────
      {
        index:   true,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },

      // ── Public / Auth routes ───────────────────────────────────
      // Rendered inside the centred AuthLayout card.
      {
        element:  <AuthLayout />,
        children: routePartitions.public.map(toRouteObject),
      },

      // ── Protected app routes ───────────────────────────────────
      // ProtectedRoute checks authentication before rendering children.
      // DashboardLayout provides the sidebar, topnav, and footer chrome.
      {
        element: <ProtectedRoute />,
        children: [
          {
            element:  <DashboardLayout />,
            children: routePartitions.protected.map(toRouteObject),
          },
        ],
      },

      // ── 404 catch-all ──────────────────────────────────────────
      {
        path:    ROUTES.NOT_FOUND,
        element: <NotFoundPage />,
      },
    ],
  },
]);

// ─── Export ───────────────────────────────────────────────────────

export function AppRouter() {
  return <RouterProvider router={router} />;
}

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
