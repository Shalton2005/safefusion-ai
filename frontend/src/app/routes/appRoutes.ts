/**
 * Protected App Route Definitions
 *
 * Every route that lives inside the authenticated DashboardLayout.
 * Order determines the sidebar navigation order.
 *
 * To add a new protected page:
 *   1. Create the page in src/features/<name>/pages/<Name>Page.tsx
 *   2. Add an entry to this array
 *   3. Add the path constant to src/constants/routes.ts
 *   That's it – the router, sidebar, and breadcrumbs update automatically.
 */

import { lazy } from 'react';
import {
  LayoutDashboard,
  Activity,
  HardHat,
  Radio,
  FileCheck2,
  Bell,
  FileBarChart2,
  BarChart3,
  Settings,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import type { AppRouteDefinition } from './types';

export const appRouteDefinitions: AppRouteDefinition[] = [
  // ── Dashboard ──────────────────────────────────────────────────
  {
    id:          'dashboard',
    path:        ROUTES.DASHBOARD,
    label:       'Dashboard',
    description: 'Real-time overview of your safety monitoring system.',
    icon:        LayoutDashboard,
    showInNav:   true,
    isProtected: true,
    component: lazy(() =>
      import('@/features/dashboard/pages/DashboardPage').then((m) => ({
        default: m.DashboardPage,
      })),
    ),
  },

  // ── Live Monitoring ────────────────────────────────────────────
  {
    id:          'live-monitoring',
    path:        ROUTES.LIVE_MONITORING,
    label:       'Live Monitoring',
    description: 'Real-time status of all connected devices and sensors.',
    icon:        Activity,
    showInNav:   true,
    isProtected: true,
    component: lazy(() =>
      import('@/features/live-monitoring/pages/LiveMonitoringPage').then((m) => ({
        default: m.LiveMonitoringPage,
      })),
    ),
  },

  // ── Workers ───────────────────────────────────────────────────
  {
    id:          'workers',
    path:        ROUTES.WORKERS,
    label:       'Workers',
    description: 'Track worker attendance, zones, and safety certifications.',
    icon:        HardHat,
    showInNav:   true,
    isProtected: true,
    component: lazy(() =>
      import('@/features/workers/pages/WorkersPage').then((m) => ({
        default: m.WorkersPage,
      })),
    ),
  },

  // ── Sensors ───────────────────────────────────────────────────
  {
    id:          'sensors',
    path:        ROUTES.SENSORS,
    label:       'Sensors',
    description: 'Monitor connected sensor hardware across all zones.',
    icon:        Radio,
    showInNav:   true,
    isProtected: true,
    component: lazy(() =>
      import('@/features/sensors/pages/SensorsPage').then((m) => ({
        default: m.SensorsPage,
      })),
    ),
  },

  // ── Permits ───────────────────────────────────────────────────
  {
    id:          'permits',
    path:        ROUTES.PERMITS,
    label:       'Permits',
    description: 'Review and track work permits across all active sites.',
    icon:        FileCheck2,
    showInNav:   true,
    isProtected: true,
    component: lazy(() =>
      import('@/features/permits/pages/PermitsPage').then((m) => ({
        default: m.PermitsPage,
      })),
    ),
  },

  // ── Alerts ────────────────────────────────────────────────────
  {
    id:          'alerts',
    path:        ROUTES.ALERTS,
    label:       'Alerts',
    description: 'Monitor, acknowledge, and resolve safety alerts.',
    icon:        Bell,
    showInNav:   true,
    isProtected: true,
    // badge will be wired to a live alert count store in a later sprint
    badge:       undefined,
    component: lazy(() =>
      import('@/features/alerts/pages/AlertsPage').then((m) => ({
        default: m.AlertsPage,
      })),
    ),
  },

  // ── Analytics ─────────────────────────────────────────────────
  {
    id:          'analytics',
    path:        ROUTES.ANALYTICS,
    label:       'Analytics',
    description: 'Deep-dive insights into safety performance and trends.',
    icon:        BarChart3,
    showInNav:   true,
    isProtected: true,
    component: lazy(() =>
      import('@/features/analytics/pages/AnalyticsPage').then((m) => ({
        default: m.AnalyticsPage,
      })),
    ),
  },

  // ── Reports ───────────────────────────────────────────────────
  {
    id:          'reports',
    path:        ROUTES.REPORTS,
    label:       'Reports',
    description: 'Generate and download safety compliance reports.',
    icon:        FileBarChart2,
    showInNav:   true,
    isProtected: true,
    component: lazy(() =>
      import('@/features/reports/pages/ReportsPage').then((m) => ({
        default: m.ReportsPage,
      })),
    ),
  },

  // ── Incident Report (detail route, not shown in sidebar nav) ────
  {
    id:          'incident-report',
    path:        ROUTES.INCIDENT_REPORT,
    label:       'Incident Report',
    description: 'Structured incident report.',
    showInNav:   false,
    isProtected: true,
    component: lazy(() =>
      import('@/features/incidents/pages/IncidentReportPage').then((m) => ({
        default: m.IncidentReportPage,
      })),
    ),
  },

  // ── Settings ──────────────────────────────────────────────────
  {
    id:          'settings',
    path:        ROUTES.SETTINGS,
    label:       'Settings',
    description: 'Manage your account, preferences, and platform configuration.',
    icon:        Settings,
    showInNav:   true,
    isProtected: true,
    component: lazy(() =>
      import('@/features/settings/pages/SettingsPage').then((m) => ({
        default: m.SettingsPage,
      })),
    ),
  },
];
