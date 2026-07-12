// ─── Navigation routes ─────────────────────────────────────────────
export const ROUTES = {
  // Public
  LOGIN: '/login',

  // App root
  HOME: '/',

  // Main sections
  DASHBOARD:       '/dashboard',
  LIVE_MONITORING: '/live-monitoring',
  WORKERS:         '/workers',
  SENSORS:         '/sensors',
  PERMITS:         '/permits',
  ALERTS:          '/alerts',
  ANALYTICS:       '/analytics',
  REPORTS:         '/reports',
  SETTINGS:        '/settings',

  // Detail routes (not shown in sidebar nav)
  INCIDENT_REPORT: '/incidents/:incidentId/report',

  // 404
  NOT_FOUND: '*',
} as const;

/** Builds a concrete `/incidents/{id}/report` path from an incident ID. */
export function incidentReportPath(incidentId: string): string {
  return `/incidents/${incidentId}/report`;
}

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
