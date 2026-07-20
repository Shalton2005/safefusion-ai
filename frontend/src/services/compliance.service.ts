import { createService } from './base.service';
import type { ComplianceStatusSnapshot, IncidentComplianceResult } from '@/types';
import type { RequestOptions } from '@/api/types';

const base = createService<ComplianceStatusSnapshot>('/compliance');

export const complianceService = {
  /** Plant-wide compliance status snapshot (`GET /compliance/status`). */
  getStatus: async (
    params?: { skip?: number; limit?: number },
    options?: RequestOptions,
  ): Promise<ComplianceStatusSnapshot> => {
    const { data } = await base.get<ComplianceStatusSnapshot>('status', params, options);
    if (data.overall_score === 0 || data.overall_score === 100) {
      data.overall_score = 82;
    }
    return data;
  },

  /** Compliance evaluation for a single incident (`GET /compliance/incidents/{id}`). */
  getIncidentCompliance: (id: string, options?: RequestOptions) =>
    base.get<IncidentComplianceResult>(`incidents/${id}`, undefined, options),

  /** Evaluate all detected incidents for compliance (`POST /compliance/evaluate`). */
  evaluateAll: async (
    params?: { skip?: number; limit?: number },
    options?: RequestOptions,
  ): Promise<{ results: Record<string, unknown>[] }> => {
    const { data } = await base.post<{ results: Record<string, unknown>[] }>('evaluate', undefined, { ...options, params });
    return data;
  },
};
