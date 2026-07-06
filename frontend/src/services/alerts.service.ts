import apiClient from '@/api/client';
import type { ApiResponse, Alert, PaginatedResponse } from '@/types';
import type { AlertStatus } from '@/constants';

const BASE = '/alerts';

export const alertsService = {
  getAlerts: (params?: { page?: number; pageSize?: number; status?: AlertStatus }) =>
    apiClient.get<PaginatedResponse<Alert>>(BASE, { params }),

  getAlert: (id: string) =>
    apiClient.get<ApiResponse<Alert>>(`${BASE}/${id}`),

  acknowledgeAlert: (id: string) =>
    apiClient.patch<ApiResponse<Alert>>(`${BASE}/${id}/acknowledge`),

  resolveAlert: (id: string) =>
    apiClient.patch<ApiResponse<Alert>>(`${BASE}/${id}/resolve`),
};
