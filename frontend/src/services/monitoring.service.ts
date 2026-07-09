import { createService } from './base.service';
import type { Device, RiskSummary } from '@/types';
import type { ApiResponse } from '@/types';
import type { ListParams, RequestOptions } from '@/api/types';

const base = createService<Device>('/monitoring');

export const monitoringService = {
  ...base,

  /** Paginated list of all connected devices. */
  getDevices: (params?: ListParams) => base.getMany(params),

  /** Live metric readings for a specific device. */
  getDeviceMetrics: (
    id:      string,
    params?: { from?: string; to?: string },
  ) =>
    base.get<ApiResponse<Record<string, number[]>>>(
      `${id}/metrics`,
      params,
    ),

  /** Aggregated overall risk score, level, and trend. */
  getSummary: (options?: RequestOptions) =>
    base.get<ApiResponse<RiskSummary>>('summary', undefined, options),
};
