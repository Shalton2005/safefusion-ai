export const APP_NAME    = 'SafeFusion AI';
export const APP_VERSION = '0.1.0';

// Local storage keys
export const LS_THEME_KEY    = 'safefusion:theme';
export const LS_SIDEBAR_KEY  = 'safefusion:sidebar-collapsed';
export const LS_COPILOT_KEY  = 'safefusion:copilot-conversations';

// Polling intervals (ms)
// Default for most dashboard panels — was 1000ms for every panel
// (workers, permits, analytics, PPE compliance, ...), which meant ~24
// independent polling hooks each fired their own HTTP request every
// second regardless of whether that panel's data plausibly changes that
// often. Raised to reduce request fan-out; panels where the live incident
// narrative benefits from sub-3s freshness use FAST_REFRESH_INTERVAL
// instead (see each hook's call site).
export const DASHBOARD_REFRESH_INTERVAL = 3000;
// Fast tier for panels tracking the demo scenario's 1-second tick loop
// directly (sensors, compound risk, emergency response) — kept at the
// original 1000ms so the live-incident narrative still feels responsive.
export const FAST_REFRESH_INTERVAL = 1000;

// Severity levels
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export const SEVERITY_LEVELS: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

// Alert status
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
