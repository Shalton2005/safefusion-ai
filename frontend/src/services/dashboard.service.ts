import { createService } from './base.service';
import type { AnalyticsSummary, DashboardPayload, DashboardSummary, PlantSafetyOverview, ZoneOverview } from '@/types';
import type { ApiResponse } from '@/types';
import type { SeverityLevel } from '@/constants';
import { SEVERITY_LEVELS } from '@/constants';
import type { RequestOptions } from '@/api/types';

const base = createService<AnalyticsSummary>('/dashboard');

function toRiskLevel(level: string | null): SeverityLevel | null {
  return (SEVERITY_LEVELS as readonly string[]).includes(level ?? '') ? (level as SeverityLevel) : null;
}

/** Reduces the full dashboard payload into the plant-wide safety snapshot — every value comes straight from the backend. */
function toPlantSafetyOverview(payload: DashboardPayload): PlantSafetyOverview {
  const active_sensors = payload.zones.reduce(
    (sum, zone) => sum + zone.normal_count + zone.warning_count + zone.critical_count,
    0,
  );

  return {
    total_workers: payload.summary.total_workers,
    active_sensors,
    active_permits: payload.summary.active_permits,
    open_alerts: payload.summary.active_alerts,
    risk_level: toRiskLevel(payload.summary.overall_risk_level),
  };
}

export const dashboardService = {
  /** Aggregated KPI summary counters, including overall risk score/level. */
  getSummary: (options?: RequestOptions) =>
    base.get<ApiResponse<DashboardSummary>>('summary', undefined, options),

  /** Full dashboard payload (summary counters + per-zone sensor breakdown). */
  getDashboard: (options?: RequestOptions) =>
    base.get<ApiResponse<DashboardPayload>>('', undefined, options),

  /** Plant-wide safety snapshot for the `PlantSafetyOverview` component. */
  getPlantSafetyOverview: async (options?: RequestOptions): Promise<PlantSafetyOverview> => {
    const { data } = await base.get<ApiResponse<DashboardPayload>>('', undefined, options);
    return toPlantSafetyOverview(data.data);
  },

  /** Per-zone overview (worker/sensor/permit counts + risk level) for the `ZoneOverview` component. */
  getZoneOverview: async (options?: RequestOptions) => {
    const res = await base.get<ApiResponse<{ zones: ZoneOverview[] }>>('zones', undefined, options);
    // Returns unmodified array
    return res;
  },
};
