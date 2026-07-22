/**
 * Auth Store
 *
 * Single source of truth for authentication state. Tokens are persisted
 * to localStorage (read directly by the Axios request interceptor —
 * see src/api/interceptors/request.ts) so a page refresh does not log
 * the user out; store state is rehydrated from localStorage on init.
 */

import { create } from 'zustand';
import { authService, type AuthUser } from '@/services/auth.service';
import { ApiError } from '@/api/errors';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadCurrentUser: () => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => void;
}


function hasStoredSession(): boolean {
  return Boolean(localStorage.getItem('access_token'));
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: hasStoredSession(),
  isLoading: hasStoredSession(),
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authService.login({ email, password });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      const { data: user } = await authService.me();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      const apiError = ApiError.from(err);
      set({ isLoading: false, isAuthenticated: false, error: apiError.toUserMessage() });
      throw apiError;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false, error: null });
  },

  updateUser: (data: Partial<AuthUser>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    }));
  },

  loadCurrentUser: async () => {
    if (!hasStoredSession()) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const { data: user } = await authService.me();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      // Network/timeout/server error — the token hasn't been proven invalid,
      // so don't destroy a session over a transient backend outage. Leave
      // isAuthenticated untouched (stays true if it already was) and let
      // ProtectedRoute show a retriable error instead of bouncing to /login.
      set({ isLoading: false, error: ApiError.from(err).toUserMessage() });
    }
  },
}));
