import type { SeverityLevel, AlertStatus } from '@/constants';
import type { IncidentType, EmergencyActionType, ComplianceFramework, ComplianceStatus, RecommendationSource, PlantStatus } from '@/types';
import type { BadgeVariant } from '@/components/ui';

/**
 * Dot-marker background class for each `Badge` variant. Exported so
 * standalone status markers (e.g. a timeline's severity dot) can
 * match `Badge`'s own colours exactly instead of redefining their
 * own variant→colour mapping.
 */
export const BADGE_DOT_CLASS: Record<BadgeVariant, string> = {
  default:   'bg-[var(--sf-text-tertiary)]',
  primary:   'bg-primary-400',
  secondary: 'bg-[var(--sf-text-tertiary)]',
  success:   'bg-safe-500',
  warning:   'bg-caution-500',
  danger:    'bg-danger-500',
  ghost:     'bg-[var(--sf-text-tertiary)]',
  outline:   'bg-[var(--sf-text-primary)]',
};

/** Badge colour variant for each severity level. Single source of truth — reuse instead of redefining per component. */
export const SEVERITY_BADGE_VARIANT: Record<SeverityLevel, 'success' | 'primary' | 'warning' | 'danger'> = {
  low:      'success',
  medium:   'warning', // Amber/Yellow
  high:     'warning', // Orange
  critical: 'danger',  // Red
};

/** Text color for each severity level. */
export const SEVERITY_TEXT_COLOR: Record<SeverityLevel, string> = {
  low: 'text-safe-500',
  medium: 'text-amber-500',
  high: 'text-caution-500',
  critical: 'text-danger-500',
};

/** Background and border color for each severity level (used in cards/gauges). */
export const SEVERITY_BG_COLOR: Record<SeverityLevel, string> = {
  low: 'bg-safe-500/10 border-safe-500/20',
  medium: 'bg-amber-500/10 border-amber-500/20',
  high: 'bg-caution-500/10 border-caution-500/20',
  critical: 'bg-danger-500/10 border-danger-500/20',
};

export interface SeverityTheme {
  bgGradient: string;
  iconColor: string;
  textColor: string;
  borderColor: string;
}

/** Theme mapping for headers and banners based on severity level. */
export const SEVERITY_HEADER_THEME: Record<SeverityLevel, SeverityTheme> = {
  low: {
    bgGradient: 'from-safe-700/20 to-transparent',
    iconColor: 'text-safe-400',
    textColor: 'text-safe-500',
    borderColor: 'border-safe-500/30',
  },
  medium: {
    bgGradient: 'from-amber-700/20 to-transparent',
    iconColor: 'text-amber-400',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
  },
  high: {
    bgGradient: 'from-caution-700/20 to-transparent',
    iconColor: 'text-caution-400',
    textColor: 'text-caution-500',
    borderColor: 'border-caution-500/30',
  },
  critical: {
    bgGradient: 'from-danger-700/20 to-transparent',
    iconColor: 'text-danger-400',
    textColor: 'text-danger-500',
    borderColor: 'border-danger-500/30',
  },
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

export interface DashboardStateUI {
  plantStatusText: string;
  emergencyModeText: string;
  emergencyModeVariant: 'default' | 'danger' | 'warning';
  theme: SeverityTheme;
}

/** 
 * Maps the current dashboard state to its corresponding UI representations.
 * Ensures the banner and headers are fully synchronized.
 */
export function getDashboardStateUI(riskLevel: SeverityLevel, inEmergency: boolean): DashboardStateUI {
  // Determine Plant Status based on risk level as requested
  let plantStatusText = 'Normal';
  if (riskLevel === 'medium') plantStatusText = 'Monitoring';
  else if (riskLevel === 'high') plantStatusText = 'Warning';
  else if (riskLevel === 'critical') plantStatusText = 'Emergency';

  // Determine Emergency Mode
  let emergencyModeText = 'Inactive';
  let emergencyModeVariant: 'default' | 'danger' | 'warning' = 'default';
  
  if (inEmergency || riskLevel === 'critical') {
    emergencyModeText = 'Active';
    emergencyModeVariant = 'danger';
  } else if (riskLevel === 'high') {
    emergencyModeText = 'Standby';
    emergencyModeVariant = 'warning';
  }

  return {
    plantStatusText,
    emergencyModeText,
    emergencyModeVariant,
    theme: SEVERITY_HEADER_THEME[riskLevel]
  };
}

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

/**
 * Human-readable label for each recommendation source — the backend has no
 * separate per-recommendation status field, so this (the engine that
 * generated the recommendation) is displayed as its "Status" column.
 * Single source of truth — reuse instead of redefining per component.
 */
export const RECOMMENDATION_SOURCE_LABEL: Record<RecommendationSource, string> = {
  compound_risk:      'Compound Risk',
  emergency_response: 'Emergency Response',
  compliance:         'Compliance',
};

/** Badge colour variant for each recommendation source. Single source of truth — reuse instead of redefining per component. */
export const RECOMMENDATION_SOURCE_BADGE_VARIANT: Record<RecommendationSource, 'warning' | 'danger' | 'primary'> = {
  compound_risk:      'warning',
  emergency_response: 'danger',
  compliance:         'primary',
};

/** Bucket a Compound Risk `SeverityLevel` into the plant status vocabulary used outside of emergency mode. */
export const RISK_LEVEL_TO_PLANT_STATUS: Record<SeverityLevel, Exclude<PlantStatus, 'emergency'>> = {
  low:      'normal',
  medium:   'warning',
  high:     'critical',
  critical: 'critical',
};

/** Human-readable label for each plant status. Single source of truth — reuse instead of redefining per component. */
export const PLANT_STATUS_LABEL: Record<PlantStatus, string> = {
  normal:    'Normal',
  warning:   'Warning',
  critical:  'Critical',
  emergency: 'Emergency',
};

/**
 * Banner surface classes for each plant status — a stronger, full-width
 * treatment than a `Badge`, defined directly per status rather than
 * derived from a badge-variant map.
 */
export const PLANT_STATUS_BANNER_CLASSES: Record<PlantStatus, string> = {
  normal:    'bg-safe-500/10 border-safe-500/30',
  warning:   'bg-caution-500/10 border-caution-500/30',
  critical:  'bg-danger-500/10 border-danger-500/30',
  emergency: 'bg-danger-600/20 border-danger-600/50',
};

/**
 * Text color classes for each plant status, allowing values to be colored independently
 * of their container's text color.
 */
export const PLANT_STATUS_TEXT_CLASSES: Record<PlantStatus, string> = {
  normal:    'text-safe-700 dark:text-safe-400',
  warning:   'text-caution-700 dark:text-caution-400',
  critical:  'text-danger-700 dark:text-danger-400',
  emergency: 'text-danger-800 dark:text-danger-300',
};

/**
 * Three-tier bucketing for a 0-100 confidence score. Single source of
 * truth — previously redefined independently in `AIRecommendationCard`,
 * `AIReasoningPanel`, and `AIAgentStatusCard`, which had drifted into
 * three separate (currently identical, but easy to accidentally diverge)
 * copies of the same thresholds and colour maps.
 */
export type ConfidenceTier = 'safe' | 'caution' | 'danger';

export function confidenceTier(value: number): ConfidenceTier {
  if (value >= 75) return 'safe';
  if (value >= 40) return 'caution';
  return 'danger';
}

/** Text colour class for each confidence tier. Single source of truth — reuse instead of redefining per component. */
export const CONFIDENCE_TIER_TEXT_CLASS: Record<ConfidenceTier, string> = {
  safe:    'text-safe-600 dark:text-safe-400',
  caution: 'text-caution-600 dark:text-caution-400',
  danger:  'text-danger-600 dark:text-danger-400',
};

/** Progress-bar fill class for each confidence tier. Single source of truth — reuse instead of redefining per component. */
export const CONFIDENCE_TIER_BAR_CLASS: Record<ConfidenceTier, string> = {
  safe:    'bg-safe-500',
  caution: 'bg-caution-500',
  danger:  'bg-danger-500',
};
