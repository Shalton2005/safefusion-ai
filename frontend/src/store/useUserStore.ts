/**
 * useUserStore
 *
 * Global state for the currently authenticated user and their
 * account-level preferences.
 *
 * AUTH PLACEHOLDER ─────────────────────────────────────────────────
 * `setUser` / `clearUser` are intentionally decoupled from any
 * auth logic.  When the auth service is built, call these actions
 * after a successful login / on session expiry:
 *
 *   // After successful login:
 *   useUserStore.getState().setUser(profile);
 *
 *   // On logout / session expiry:
 *   useUserStore.getState().clearUser();
 * ──────────────────────────────────────────────────────────────────
 *
 * Preferences are persisted to localStorage so they survive page
 * reloads without requiring a server round-trip.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';

// ─── User Preferences ─────────────────────────────────────────────

export interface UserPreferences {
  /** IANA timezone identifier, e.g. 'America/New_York'. @default 'UTC' */
  timezone:             string;
  /** Display format for date values. @default 'YYYY-MM-DD' */
  dateFormat:           'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  /** UI language (ISO 639-1). @default 'en' */
  language:             string;
  /** Whether to play audio on critical alert arrival. @default true */
  alertSoundEnabled:    boolean;
  /** Whether to send email notifications for alerts. @default true */
  emailNotifications:   boolean;
  /** Condenses table rows and card padding. @default false */
  compactMode:          boolean;
  /** Dashboard widget arrangement. @default 'default' */
  dashboardLayout:      'default' | 'compact' | 'wide';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  timezone:           'UTC',
  dateFormat:         'YYYY-MM-DD',
  language:           'en',
  alertSoundEnabled:  true,
  emailNotifications: true,
  compactMode:        false,
  dashboardLayout:    'default',
};

// ─── State & Actions ──────────────────────────────────────────────

interface UserState {
  /** Null when no user is logged in (pre-auth or logged out). */
  user:        User | null;
  /** Convenience copy of `user.role` — null when no user. */
  role:        UserRole | null;
  /** Account-level preferences, persisted to localStorage. */
  preferences: UserPreferences;

  // ── Derived (computed) ──────────────────────────────────────────
  /**
   * True when a user object is present.
   *
   * NOTE: this is a UI convenience flag — do NOT rely on it for
   * security decisions.  Server-side auth checks are the authority.
   */
  isLoggedIn:  boolean;
  /**
   * Full name if available, otherwise falls back to the email address.
   * Returns an empty string when no user is loaded.
   */
  displayName: string;
  /**
   * 1-2 character initials derived from the user's name.
   * Used in avatar placeholders.
   */
  initials:    string;

  // ── Actions ────────────────────────────────────────────────────
  /**
   * Populates the store after a successful authentication.
   * Called by the auth service — not by UI components.
   */
  setUser: (user: User) => void;
  /**
   * Clears the user on logout or session expiry.
   */
  clearUser: () => void;
  /**
   * Merges partial preference updates.  Persisted automatically.
   */
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  /**
   * Resets preferences back to defaults.
   */
  resetPreferences: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────

function deriveDisplayName(user: User | null): string {
  if (!user) return '';
  const full = `${user.firstName} ${user.lastName}`.trim();
  return full || user.email;
}

function deriveInitials(user: User | null): string {
  if (!user) return '';
  const first = user.firstName?.[0] ?? '';
  const last  = user.lastName?.[0]  ?? '';
  return (first + last).toUpperCase() || user.email[0].toUpperCase();
}

// ─── Store ────────────────────────────────────────────────────────

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user:        null,
      role:        null,
      preferences: DEFAULT_PREFERENCES,

      // Derived — recomputed via getters that read current state
      get isLoggedIn():  boolean { return get().user !== null; },
      get displayName(): string  { return deriveDisplayName(get().user); },
      get initials():    string  { return deriveInitials(get().user); },

      setUser: (user) =>
        set({
          user,
          role: user.role,
        }),

      clearUser: () =>
        set({
          user: null,
          role: null,
        }),

      updatePreferences: (prefs) =>
        set((s) => ({
          preferences: { ...s.preferences, ...prefs },
        })),

      resetPreferences: () =>
        set({ preferences: DEFAULT_PREFERENCES }),
    }),
    {
      name:    'safefusion:user',
      // Only persist preferences and role — never the full user object
      // (avoid stale profile data across sessions)
      partialize: (s) => ({
        preferences: s.preferences,
        role:        s.role,
      }),
    },
  ),
);
