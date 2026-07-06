// ─── Theme ────────────────────────────────────────────────────────
export { useThemeStore }                     from './useThemeStore';

// ─── Layout / UI state ────────────────────────────────────────────
export { useSidebarStore }                   from './useSidebarStore';

// ─── Notifications ────────────────────────────────────────────────
export { useNotificationStore, toast }       from './useNotificationStore';
export type { Notification, NotificationType } from './useNotificationStore';

// ─── User ─────────────────────────────────────────────────────────
export { useUserStore }                      from './useUserStore';
export type { UserPreferences }              from './useUserStore';

// ─── Application ──────────────────────────────────────────────────
export { useAppStore }                       from './useAppStore';
export type { ConnectionStatus, FeatureFlags } from './useAppStore';
