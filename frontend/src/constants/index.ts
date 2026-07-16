export const APP_NAME    = 'SafeFusion AI';
export const APP_VERSION = '0.1.0';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// Toast durations (ms)
export const TOAST_DURATION_SHORT  = 3000;
export const TOAST_DURATION_NORMAL = 5000;
export const TOAST_DURATION_LONG   = 8000;

// Local storage keys
export const LS_THEME_KEY    = 'safefusion:theme';
export const LS_SIDEBAR_KEY  = 'safefusion:sidebar-collapsed';
export const LS_COPILOT_KEY  = 'safefusion:copilot-conversations';

// Polling intervals (ms)
export const MONITOR_POLL_INTERVAL   = 5000;
export const ALERT_POLL_INTERVAL     = 10000;
export const DASHBOARD_REFRESH_INTERVAL = 10000;

// Severity levels
export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

// Alert status
export const ALERT_STATUSES = ['active', 'acknowledged', 'resolved'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];
