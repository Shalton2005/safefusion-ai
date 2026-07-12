import { createService } from './base.service';
import type { IncidentReportData } from '@/types';
import type { RequestOptions } from '@/api/types';

const base = createService<IncidentReportData>('/incident-reports');

export const incidentReportService = {
  /** Structured six-section incident report (`GET /incident-reports/{incident_id}`). */
  getReport: async (incidentId: string, options?: RequestOptions): Promise<IncidentReportData> => {
    const { data } = await base.get<IncidentReportData>(incidentId, undefined, options);
    return data;
  },
};
