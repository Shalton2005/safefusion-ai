import { createService } from './base.service';
import type { AnalyticsSummary } from '@/types';
import type { ApiResponse } from '@/types';

const base = createService<AnalyticsSummary>('/dashboard');

export const dashboardService = {
  /** Aggregated KPI summary for the dashboard header cards. */
  getSummary: () =>
    base.get<ApiResponse<AnalyticsSummary>>('summary'),
};
