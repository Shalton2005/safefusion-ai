// ─── Theme ────────────────────────────────────────────────────────
export { useThemeStore }                     from './useThemeStore';

// ─── Layout / UI state ────────────────────────────────────────────
export { useSidebarStore }                   from './useSidebarStore';
export { useRightPanelStore }                from './useRightPanelStore';

// ─── Cross-tree data bridges ──────────────────────────────────────
export { usePlantStatusStore }               from './usePlantStatusStore';

// ─── AI Supervisor ────────────────────────────────────────────────
export { useAISupervisorStore }              from './aiSupervisorStore';

// ─── AI Safety Copilot ────────────────────────────────────────────
export { useCopilotStore }                   from './useCopilotStore';
export type { CopilotConversationMeta }      from './useCopilotStore';

// ─── Notifications ────────────────────────────────────────────────
export { useNotificationStore, toast }       from './useNotificationStore';
export type { Notification, NotificationType } from './useNotificationStore';

// ─── User ─────────────────────────────────────────────────────────
export { useUserStore }                      from './useUserStore';
export type { UserPreferences }              from './useUserStore';

// ─── Application ──────────────────────────────────────────────────
export { useAppStore }                       from './useAppStore';
export type { ConnectionStatus, FeatureFlags } from './useAppStore';
