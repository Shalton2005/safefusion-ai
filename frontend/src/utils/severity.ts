import type { SeverityLevel, AlertStatus } from '@/constants';
import type { IncidentType } from '@/types';

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

/** Human-readable label for each incident type. Single source of truth — reuse instead of redefining per component. */
export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  gas_leak:      'Gas Leak',
  fire:          'Fire',
  explosion:     'Explosion',
  ppe_violation: 'PPE Violation',
};
