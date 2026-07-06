import { createService } from './base.service';
import type { AnalyticsSummary, TimeSeriesPoint } from '@/types';
import type { ApiResponse } from '@/types';

const base = createService<AnalyticsSummary>('/analytics');

export const analyticsService = {
  /** Top-level KPI summary for the analytics dashboard. */
  getSummary: () =>
    base.get<ApiResponse<AnalyticsSummary>>('summary'),

  /** Alert count grouped by day for the given date range. */
  getAlertTrend: (params?: { from?: string; to?: string }) =>
    base.get<ApiResponse<TimeSeriesPoint[]>>('alert-trend', params),

  /** Incident rate per sensor zone over time. */
  getIncidentRate: (params?: { from?: string; to?: string }) =>
    base.get<ApiResponse<TimeSeriesPoint[]>>('incident-rate', params),
};
