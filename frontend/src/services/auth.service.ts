import apiClient from '@/api/client';
import type { RequestOptions } from '@/api/types';

// ─── Types ──────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'safety_officer' | 'viewer';
  is_active: boolean;
  created_at: string;
  department?: string;
  phone_number?: string;
  employee_id?: string;
  last_login?: string;
}

// ─── Service ────────────────────────────────────────────────────────

export const authService = {
  login: (payload: LoginPayload, options?: RequestOptions) =>
    apiClient.post<TokenResponse>('/auth/login', payload, {
      ...options,
      headers: { ...options?.headers, 'X-Skip-Auth': '1' },
    }),

  refresh: (refreshToken: string, options?: RequestOptions) =>
    apiClient.post<TokenResponse>(
      '/auth/refresh',
      { refresh_token: refreshToken },
      { ...options, headers: { ...options?.headers, 'X-Skip-Auth': '1' } },
    ),

  me: (options?: RequestOptions) => apiClient.get<AuthUser>('/auth/me', options),
};
