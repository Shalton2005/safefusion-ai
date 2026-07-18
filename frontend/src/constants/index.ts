export const APP_NAME    = 'SafeFusion AI';
export const APP_VERSION = '0.1.0';

// Local storage keys
export const LS_THEME_KEY    = 'safefusion:theme';
export const LS_SIDEBAR_KEY  = 'safefusion:sidebar-collapsed';
export const LS_COPILOT_KEY  = 'safefusion:copilot-conversations';

// Polling intervals (ms)
export const DASHBOARD_REFRESH_INTERVAL = 10000;

// Severity levels
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export const SEVERITY_LEVELS: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

// Alert status
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
