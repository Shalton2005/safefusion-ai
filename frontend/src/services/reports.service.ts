import apiClient from '@/api/client';
import type { ApiResponse, Report, PaginatedResponse } from '@/types';

const BASE = '/reports';

export const reportsService = {
  getReports: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<PaginatedResponse<Report>>(BASE, { params }),

  getReport: (id: string) =>
    apiClient.get<ApiResponse<Report>>(`${BASE}/${id}`),

  generateReport: (payload: { title: string; type: string }) =>
    apiClient.post<ApiResponse<Report>>(BASE, payload),

  deleteReport: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`),
};
