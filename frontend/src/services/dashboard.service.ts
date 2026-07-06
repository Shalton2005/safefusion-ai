import apiClient from '@/api/client';
import type { ApiResponse, AnalyticsSummary } from '@/types';

const BASE = '/dashboard';

export const dashboardService = {
  getSummary: () =>
    apiClient.get<ApiResponse<AnalyticsSummary>>(`${BASE}/summary`),
};
