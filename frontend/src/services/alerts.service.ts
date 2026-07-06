import { createService } from './base.service';
import apiClient from '@/api/client';
import type { ApiResponse, Alert } from '@/types';
import type { AlertStatus } from '@/constants';
import type { ListParams } from '@/api/types';

const base = createService<Alert>('/alerts');

export const alertsService = {
  ...base,

  /** Fetch alerts filtered by status. */
  getAlerts: (params?: ListParams & { status?: AlertStatus }) =>
    base.getMany(params),

  /** Acknowledge an active alert. */
  acknowledgeAlert: (id: string) =>
    apiClient.patch<ApiResponse<Alert>>(`/alerts/${id}/acknowledge`),

  /** Resolve an acknowledged alert. */
  resolveAlert: (id: string) =>
    apiClient.patch<ApiResponse<Alert>>(`/alerts/${id}/resolve`),
};
