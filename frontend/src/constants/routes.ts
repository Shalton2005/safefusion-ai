// ─── Navigation routes ─────────────────────────────────────────────
export const ROUTES = {
  // Public
  LOGIN: '/login',

  // App root
  HOME: '/',

  // Main sections
  DASHBOARD:       '/dashboard',
  LIVE_MONITORING: '/live-monitoring',
  ALERTS:          '/alerts',
  REPORTS:         '/reports',
  ANALYTICS:       '/analytics',
  SETTINGS:        '/settings',

  // 404
  NOT_FOUND: '*',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
