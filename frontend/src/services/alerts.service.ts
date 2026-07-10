import { createService } from './base.service';
import apiClient from '@/api/client';
import type { ApiResponse, Alert, AlertRecord } from '@/types';
import type { AlertStatus } from '@/constants';
import type { ListParams } from '@/api/types';
import type { RequestOptions } from '@/api/types';

const base = createService<Alert>('/alerts');

export const alertsService = {
  ...base,

  /** Fetch alerts filtered by status. */
  getAlerts: (params?: ListParams & { status?: AlertStatus }) =>
    base.getMany(params),

  /** Bare, paginated list of real alert records as returned by `GET /alerts` — use for any live-data component. */
  getRecentAlerts: (
    params?:  { skip?: number; limit?: number },
    options?: RequestOptions,
  ) => base.get<AlertRecord[]>('', params, options),

  /** Acknowledge an active alert. */
  acknowledgeAlert: (id: string) =>
    apiClient.patch<ApiResponse<Alert>>(`/alerts/${id}/acknowledge`),

  /** Resolve an acknowledged alert. */
  resolveAlert: (id: string) =>
    apiClient.patch<ApiResponse<Alert>>(`/alerts/${id}/resolve`),
};
