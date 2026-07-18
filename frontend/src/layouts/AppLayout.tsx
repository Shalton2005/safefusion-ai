/**
 * AppLayout – Root Application Layout
 *
 * The outermost layout wrapper rendered on every route.
 * Responsibilities:
 *   • Hosts global UI singletons (toast notifications, portal targets)
 *   • Applies the top-level color-scheme / theme attribute
 *   • Does NOT contain sidebar, topnav, or any page chrome –
 *     those live in DashboardLayout / AuthLayout
 *
 * Layout hierarchy:
 *   AppLayout
 *   ├── AuthLayout       (login, etc.)
 *   ├── ProtectedRoute
 *   │   └── DashboardLayout   (sidebar + topnav + footer)
 *   │       └── <Page>
 *   └── NotFoundPage
 */

import { Outlet } from 'react-router-dom';
import { NotificationToast } from '@/components/common/NotificationToast';
import { useThemeStore } from '@/store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function AppLayout() {
  // Ensure the resolved theme class is applied on first paint.
  // useThemeStore's persist middleware calls applyTheme on rehydration,
  // but this selector keeps the component subscribed for any runtime changes.
  useThemeStore((s) => s.resolvedTheme);

  // Keeps the browser tab title in sync with the active route.
  useDocumentTitle();

  return (
    <>
      {/* Page content – filled by child layouts via <Outlet /> */}
      <Outlet />

      {/* ── Global UI singletons ─────────────────────────────── */}

      {/* Toast notifications (renders above all other content) */}
      <NotificationToast />

      {/*
       * Global modal portal target:
       * Modals rendered via createPortal(…, document.body) already work.
       * Add a named portal root here if you need scoped stacking contexts:
       *   <div id="modal-root" />
       */}
    </>
  );
}
