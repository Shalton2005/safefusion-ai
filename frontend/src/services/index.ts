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
export { demoService }      from './demo.service';
export { emergencyResponseService } from './emergencyResponse.service';
export { graphService } from './graph.service';
export { incidentReportService } from './incidentReport.service';
export { incidentsService } from './incidents.service';
export { permitsService }   from './permits.service';
export { recommendationService } from './recommendation.service';
export { reportsService }   from './reports.service';
export { safetyTimelineService } from './safetyTimeline.service';
export { sensorsService }  from './sensors.service';
export { visionService }   from './vision.service';
export { workersService }  from './workers.service';
export { userService }     from './user.service';
export type { 
  UserProfileResponse, 
  UserProfileUpdate, 
  UserPreferencesResponse, 
  UserPreferencesUpdate, 
  UserPasswordUpdate, 
  UserIntegrationsResponse 
} from './user.service';

export { createService }    from './base.service';
export type { BaseService } from './base.service';
