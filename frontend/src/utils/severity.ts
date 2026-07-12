import type { SeverityLevel, AlertStatus } from '@/constants';
import type { IncidentType, EmergencyActionType, ComplianceFramework, ComplianceStatus } from '@/types';

/** Badge colour variant for each severity level. Single source of truth — reuse instead of redefining per component. */
export const SEVERITY_BADGE_VARIANT: Record<SeverityLevel, 'success' | 'primary' | 'warning' | 'danger'> = {
  low:      'success',
  medium:   'primary',
  high:     'warning',
  critical: 'danger',
};

/** Badge colour variant for each alert status. Single source of truth — reuse instead of redefining per component. */
export const ALERT_STATUS_BADGE_VARIANT: Record<AlertStatus, 'danger' | 'warning' | 'success'> = {
  active:       'danger',
  acknowledged: 'warning',
  resolved:     'success',
};

/**
 * Priority label derived 1:1 from severity — the backend does not track a
 * separate priority field, so this is a presentational bucketing of the
 * real severity value, not a fabricated signal. Single source of truth.
 */
export const SEVERITY_PRIORITY_LABEL: Record<SeverityLevel, string> = {
  low:      'Low',
  medium:   'Normal',
  high:     'High',
  critical: 'Urgent',
};

/** Human-readable label for each incident type. Single source of truth — reuse instead of redefining per component. */
export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  gas_leak:      'Gas Leak',
  fire:          'Fire',
  explosion:     'Explosion',
  ppe_violation: 'PPE Violation',
};

/** Human-readable label for each emergency action type. Single source of truth — reuse instead of redefining per component. */
export const EMERGENCY_ACTION_LABEL: Record<EmergencyActionType, string> = {
  notify_safety_officer: 'Notify Safety Officer',
  notify_control_room:   'Notify Control Room',
  stop_work:             'Stop Work',
  isolate_equipment:     'Isolate Equipment',
  evacuate_area:         'Evacuate Area',
  generate_incident:     'Generate Incident',
};

/** Short badge label for each regulatory framework. Single source of truth — reuse instead of redefining per component. */
export const COMPLIANCE_FRAMEWORK_LABEL: Record<ComplianceFramework, string> = {
  factory_act: 'Factory Act',
  oisd:        'OISD',
  dgms:        'DGMS',
};

/** Badge colour variant for each regulatory framework. Single source of truth — reuse instead of redefining per component. */
export const COMPLIANCE_FRAMEWORK_BADGE_VARIANT: Record<ComplianceFramework, 'primary' | 'warning' | 'secondary'> = {
  factory_act: 'primary',
  oisd:        'warning',
  dgms:        'secondary',
};

/** Badge colour variant for each compliance status. Single source of truth — reuse instead of redefining per component. */
export const COMPLIANCE_STATUS_BADGE_VARIANT: Record<ComplianceStatus, 'success' | 'danger'> = {
  compliant:     'success',
  non_compliant: 'danger',
};

/** Human-readable label for each compliance status. Single source of truth — reuse instead of redefining per component. */
export const COMPLIANCE_STATUS_LABEL: Record<ComplianceStatus, string> = {
  compliant:     'Compliant',
  non_compliant: 'Non-Compliant',
};
