import { createService } from './base.service';
import type { SensorReading } from '@/types';
import type { RequestOptions } from '@/api/types';

const base = createService<SensorReading>('/sensors');

export const sensorsService = {
  ...base,

  /** Paginated list of ingested sensor readings across all zones. */
  getSensors: (
    params?:  { skip?: number; limit?: number },
    options?: RequestOptions,
  ) => base.get<SensorReading[]>('', params, options),
};
