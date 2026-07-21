import apiClient from '@/api/client';
import type { RequestOptions } from '@/api/types';

export interface UserProfileResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  phone_number?: string;
  employee_id?: string;
  last_login?: string;
}

export interface UserProfileUpdate {
  full_name?: string;
  email?: string;
  department?: string;
  phone_number?: string;
}

export interface UserPreferencesResponse {
  preferences: Record<string, any>;
}

export interface UserPreferencesUpdate {
  critical_alerts?: boolean;
  high_severity_alerts?: boolean;
  daily_summary?: boolean;
  system_maintenance?: boolean;
  theme?: string;
}

export interface UserPasswordUpdate {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface UserIntegrationsResponse {
  rest_api: string;
  websocket: string;
  smtp: string;
  last_sync: string;
}

export const userService = {
  getProfile: (options?: RequestOptions) => 
    apiClient.get<UserProfileResponse>('/user/profile', { ...options }).then(res => res.data),
    
  updateProfile: (data: UserProfileUpdate, options?: RequestOptions) =>
    apiClient.put<UserProfileResponse>('/user/profile', data, { ...options }).then(res => res.data),

  getPreferences: (options?: RequestOptions) =>
    apiClient.get<UserPreferencesResponse>('/user/preferences', { ...options }).then(res => res.data),
    
  updatePreferences: (data: UserPreferencesUpdate, options?: RequestOptions) =>
    apiClient.put<UserPreferencesResponse>('/user/preferences', data, { ...options }).then(res => res.data),

  updatePassword: (data: UserPasswordUpdate, options?: RequestOptions) =>
    apiClient.put<void>('/user/password', data, { ...options }).then(res => res.data),
    
  getIntegrations: (options?: RequestOptions) =>
    apiClient.get<UserIntegrationsResponse>('/user/integrations', { ...options }).then(res => res.data),
};
