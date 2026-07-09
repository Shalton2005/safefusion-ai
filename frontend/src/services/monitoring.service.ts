import { createService } from './base.service';
import type { Device } from '@/types';
import type { ApiResponse } from '@/types';
import type { ListParams } from '@/api/types';

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

  // NOTE: there is no GET /monitoring/summary route on the backend.
  // Overall risk score/level is served by GET /dashboard/summary instead —
  // see dashboardService.getSummary() in dashboard.service.ts.
};
