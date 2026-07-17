/**
 * Services barrel
 *
 * Import domain services from here:
 *   import { alertsService, monitoringService } from '@/services';
 */

export { aiService }        from './ai.service';
export { alertsService }    from './alerts.service';
export { analyticsService } from './analytics.service';
export { complianceService } from './compliance.service';
export { compoundRiskService } from './compoundRisk.service';
export { dashboardService } from './dashboard.service';
export { emergencyResponseService } from './emergencyResponse.service';
export { graphService } from './graph.service';
export { incidentReportService } from './incidentReport.service';
export { incidentsService } from './incidents.service';
export { monitoringService }from './monitoring.service';
export { permitsService }   from './permits.service';
export { recommendationService } from './recommendation.service';
export { reportsService }   from './reports.service';
export { safetyTimelineService } from './safetyTimeline.service';
export { sensorsService }  from './sensors.service';
export { workersService }  from './workers.service';

export { createService }    from './base.service';
export type { BaseService } from './base.service';
