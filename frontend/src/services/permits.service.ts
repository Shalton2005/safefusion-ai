import { createService } from './base.service';
import type { Permit } from '@/types';
import type { RequestOptions } from '@/api/types';

const base = createService<Permit>('/permits');

export const permitsService = {
  ...base,

  /** Paginated list of Permit-to-Work records across all zones. */
  getPermits: (
    params?:  { skip?: number; limit?: number },
    options?: RequestOptions,
  ) => base.get<Permit[]>('', params, options),
};
