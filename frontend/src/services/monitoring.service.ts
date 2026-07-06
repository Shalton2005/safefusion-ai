import apiClient from '@/api/client';
import type { ApiResponse, Device, PaginatedResponse } from '@/types';

const BASE = '/monitoring';

export const monitoringService = {
  getDevices: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<PaginatedResponse<Device>>(BASE, { params }),

  getDevice: (id: string) =>
    apiClient.get<ApiResponse<Device>>(`${BASE}/${id}`),

  getDeviceMetrics: (id: string, params?: { from?: string; to?: string }) =>
    apiClient.get<ApiResponse<Record<string, number[]>>>(`${BASE}/${id}/metrics`, { params }),
};
