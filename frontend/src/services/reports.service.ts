import { createService } from './base.service';
import type { Report } from '@/types';
import type { ApiResponse } from '@/types';
import type { ListParams } from '@/api/types';

const base = createService<Report>('/reports');

export const reportsService = {
  ...base,

  /** Paginated report history. */
  getReports: (params?: ListParams) => base.getMany(params),

  /**
   * Request generation of a new report.
   * The backend responds immediately with a "pending" Report —
   * poll `getOne(id)` or subscribe via WebSocket for completion.
   */
  generateReport: (payload: { title: string; type: string }) =>
    base.create<Report>(payload),

  /** Hard-delete a report. */
  deleteReport: (id: string) => base.remove(id),
};
