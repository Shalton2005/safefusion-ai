/**
 * Services barrel
 *
 * Import domain services from here:
 *   import { alertsService, monitoringService } from '@/services';
 */

export { alertsService }    from './alerts.service';
export { analyticsService } from './analytics.service';
export { dashboardService } from './dashboard.service';
export { monitoringService }from './monitoring.service';
export { reportsService }   from './reports.service';
export { workersService }  from './workers.service';

export { createService }    from './base.service';
export type { BaseService } from './base.service';
