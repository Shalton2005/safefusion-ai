import { createService } from './base.service';
import type { Incident } from '@/types';
import type { RequestOptions } from '@/api/types';

const base = createService<Incident>('/incidents');

export const incidentsService = {
  ...base,

  /** Paginated list of safety incidents (alerts) across all zones. */
  getIncidents: (
    params?:  { skip?: number; limit?: number },
    options?: RequestOptions,
  ) => base.get<Incident[]>('', params, options),
};
