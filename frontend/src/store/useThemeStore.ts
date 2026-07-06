/**
 * useThemeStore
 *
 * Manages the active colour scheme (light / dark / system).
 *
 * - 'system' follows the OS preference and updates automatically
 *   when the user changes their system setting.
 * - Selection is persisted to localStorage.
 * - applyTheme() mutates the DOM <html> class synchronously so
 *   there is no flash of un-themed content on reload.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '@/types';
import { LS_THEME_KEY } from '@/constants';

// ─── Types ────────────────────────────────────────────────────────

interface ThemeState {
  /** The user's explicit preference. */
  theme: Theme;
  /** The resolved value actually applied to the DOM ('light' | 'dark'). */
  resolvedTheme: 'light' | 'dark';
  /** Change the active theme and apply it immediately. */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (ignores 'system'). */
  toggleTheme: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}

function applyTheme(resolved: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme:         'dark',
      resolvedTheme: 'dark',

      setTheme: (theme) => {
        const resolved = resolveTheme(theme);
        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });
      },

      toggleTheme: () => {
        const next = get().resolvedTheme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
    }),
    {
      name: LS_THEME_KEY,
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolveTheme(state.theme);
          applyTheme(resolved);
          state.resolvedTheme = resolved;
        }
      },
    },
  ),
);

// ─── System preference listener ───────────────────────────────────
// When the user selects 'system', re-resolve whenever the OS setting
// changes (e.g. macOS auto dark mode at sunset).

if (typeof window !== 'undefined') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      const { theme } = useThemeStore.getState();
      if (theme === 'system') {
        const resolved = e.matches ? 'dark' : 'light';
        applyTheme(resolved);
        useThemeStore.setState({ resolvedTheme: resolved });
      }
    });
}
