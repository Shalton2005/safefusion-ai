import { createService } from './base.service';
import type { Worker } from '@/types';
import type { RequestOptions } from '@/api/types';

const base = createService<Worker>('/workers');

export const workersService = {
  ...base,

  /** Paginated list of registered workers with current status and zone. */
  getWorkers: (
    params?:  { skip?: number; limit?: number },
    options?: RequestOptions,
  ) => base.get<Worker[]>('', params, options),
};
