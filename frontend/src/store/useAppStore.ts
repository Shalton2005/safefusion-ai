/**
 * useAppStore
 *
 * Global application-level state: initialisation, connectivity,
 * feature flags, and global loading indicators.
 *
 * This is distinct from page / feature state — it tracks the health
 * and runtime configuration of the application itself.
 *
 * Usage
 * ─────
 * // Check if the app is still bootstrapping
 * const isInitialising = useAppStore(s => s.isInitialising);
 *
 * // Trigger a full-screen loader
 * useAppStore.getState().setGlobalLoading(true, 'Generating report…');
 *
 * // Check a feature flag
 * const hasAi = useAppStore(s => s.features['ai-copilot'] ?? false);
 */

import { create } from 'zustand';
import env from '@/config/env';

// ─── Types ────────────────────────────────────────────────────────

/**
 * Backend connectivity health.
 *  connected    — all systems operational
 *  degraded     — partial connectivity (some services unreachable)
 *  disconnected — cannot reach the backend
 */
export type ConnectionStatus = 'connected' | 'degraded' | 'disconnected';

/** Named feature flags controlled at runtime (e.g. from a config endpoint). */
export type FeatureFlags = Record<string, boolean>;

// ─── Default feature flags ────────────────────────────────────────
// Set to `true` here to enable a feature globally.
// Flags can be overridden at runtime via `setFeatureFlag`.

const DEFAULT_FEATURES: FeatureFlags = {
  'live-alerts':      true,
  'analytics':        true,
  'report-generator': true,
  'ai-copilot':       false, // not yet implemented
  'heatmap':          false, // not yet implemented
};

// ─── State ────────────────────────────────────────────────────────

interface AppState {
  // ── Lifecycle ──────────────────────────────────────────────────
  /**
   * True while the app is bootstrapping (fetching user session,
   * loading config, etc.). Hides the router until initialisation
   * completes to prevent flashes of un-authenticated content.
   * @default true
   */
  isInitialising: boolean;

  // ── Connectivity ───────────────────────────────────────────────
  /**
   * Browser online/offline status from the `online`/`offline` events.
   * @default true
   */
  isOnline: boolean;
  /**
   * Finer-grained API connectivity status.
   * Updated by the monitoring WebSocket or a periodic health check.
   * @default 'connected'
   */
  connectionStatus: ConnectionStatus;
  /**
   * ISO-8601 timestamp of the last successful API sync.
   * Null when no sync has occurred yet.
   */
  lastSyncAt: string | null;

  // ── Versioning ─────────────────────────────────────────────────
  /** SemVer string reported by the backend health endpoint. */
  backendVersion:  string | null;
  /** SemVer string baked in from VITE_APP_VERSION at build time. */
  frontendVersion: string;

  // ── Global loading ─────────────────────────────────────────────
  /**
   * When true, a full-screen `<Loader overlay />` is displayed.
   * Use sparingly — prefer skeleton loading in individual components.
   */
  globalLoading:      boolean;
  /** Optional label displayed beneath the global loader spinner. */
  globalLoadingLabel: string | null;

  // ── Feature flags ──────────────────────────────────────────────
  /**
   * Runtime feature toggle map.
   * Check with `features['flag-name'] ?? false`.
   */
  features: FeatureFlags;

  // ── Actions ────────────────────────────────────────────────────

  /**
   * Marks the application as fully initialised.
   * Call once after the bootstrap sequence (session check, config load)
   * is complete.
   */
  setInitialised: () => void;

  /**
   * Updates the browser online status.
   * Wired to `window.addEventListener('online' | 'offline')` in AppLayout.
   */
  setOnline: (online: boolean) => void;

  /**
   * Updates the API connectivity status.
   * Called by the WebSocket connection manager or health-check poller.
   */
  setConnectionStatus: (status: ConnectionStatus) => void;

  /** Records a successful API sync timestamp (ISO-8601 string). */
  recordSync: () => void;

  /**
   * Stores the backend version string received from the health endpoint.
   */
  setBackendVersion: (version: string) => void;

  /**
   * Shows or hides the full-screen loading overlay.
   *
   * @param loading - Whether to show the overlay.
   * @param label   - Optional message to display beneath the spinner.
   */
  setGlobalLoading: (loading: boolean, label?: string) => void;

  /**
   * Enables or disables an individual feature flag at runtime.
   * Useful for server-driven feature toggles.
   */
  setFeatureFlag: (flag: string, enabled: boolean) => void;

  /**
   * Replaces all feature flags at once.
   * Typically called after fetching a remote feature-flag config.
   */
  setFeatureFlags: (flags: FeatureFlags) => void;

  /**
   * Checks whether a named feature is currently enabled.
   * Falls back to `false` for unknown flags.
   */
  isFeatureEnabled: (flag: string) => boolean;
}

// ─── Store ────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()((set, get) => ({
  // ── Initial state ───────────────────────────────────────────────
  isInitialising:     true,
  isOnline:           typeof navigator !== 'undefined' ? navigator.onLine : true,
  connectionStatus:   'connected',
  lastSyncAt:         null,
  backendVersion:     null,
  frontendVersion:    env.appVersion,
  globalLoading:      false,
  globalLoadingLabel: null,
  features:           { ...DEFAULT_FEATURES },

  // ── Actions ────────────────────────────────────────────────────
  setInitialised: () =>
    set({ isInitialising: false }),

  setOnline: (online) =>
    set({
      isOnline:         online,
      connectionStatus: online ? 'connected' : 'disconnected',
    }),

  setConnectionStatus: (status) =>
    set({ connectionStatus: status }),

  recordSync: () =>
    set({ lastSyncAt: new Date().toISOString() }),

  setBackendVersion: (version) =>
    set({ backendVersion: version }),

  setGlobalLoading: (loading, label) =>
    set({
      globalLoading:      loading,
      globalLoadingLabel: loading ? (label ?? null) : null,
    }),

  setFeatureFlag: (flag, enabled) =>
    set((s) => ({
      features: { ...s.features, [flag]: enabled },
    })),

  setFeatureFlags: (flags) =>
    set((s) => ({
      features: { ...s.features, ...flags },
    })),

  isFeatureEnabled: (flag) =>
    get().features[flag] ?? false,
}));
