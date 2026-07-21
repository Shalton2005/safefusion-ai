import apiClient from '@/api/client';
import type { RequestOptions, ApiResponse } from '@/types';
import type { AnalyticsOverviewResponse } from '@/types';

export const analyticsService = {
  getOverview: async (options?: RequestOptions): Promise<AnalyticsOverviewResponse> => {
    const response = await apiClient.get<ApiResponse<AnalyticsOverviewResponse>>('/analytics/overview', options);
    return response.data.data; // Unpack ApiResponse
  }
};
