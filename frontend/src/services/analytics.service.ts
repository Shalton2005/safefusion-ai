import apiClient from '@/api/client';
import type { ApiResponse, AnalyticsSummary, TimeSeriesPoint } from '@/types';

const BASE = '/analytics';

export const analyticsService = {
  getSummary: () =>
    apiClient.get<ApiResponse<AnalyticsSummary>>(`${BASE}/summary`),

  getAlertTrend: (params?: { from?: string; to?: string }) =>
    apiClient.get<ApiResponse<TimeSeriesPoint[]>>(`${BASE}/alert-trend`, { params }),

  getIncidentRate: (params?: { from?: string; to?: string }) =>
    apiClient.get<ApiResponse<TimeSeriesPoint[]>>(`${BASE}/incident-rate`, { params }),
};
