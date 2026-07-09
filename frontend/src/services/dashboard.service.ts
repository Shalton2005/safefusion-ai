import { createService } from './base.service';
import type { AnalyticsSummary, DashboardSummary } from '@/types';
import type { ApiResponse } from '@/types';
import type { RequestOptions } from '@/api/types';

const base = createService<AnalyticsSummary>('/dashboard');

export const dashboardService = {
  /** Aggregated KPI summary counters, including overall risk score/level. */
  getSummary: (options?: RequestOptions) =>
    base.get<ApiResponse<DashboardSummary>>('summary', undefined, options),
};
