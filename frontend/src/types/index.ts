// ─── Global TypeScript types ───────────────────────────────────────

import type { SeverityLevel } from '@/constants';

export type Theme = 'light' | 'dark' | 'system';

// ─── API primitives ────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, string[]>;
}

// ─── User / Auth ───────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'supervisor' | 'operator' | 'viewer';

// ─── Sensor / Device ───────────────────────────────────────────────
export type DeviceStatus = 'online' | 'offline' | 'warning' | 'critical';

export interface Device {
  id: string;
  name: string;
  location: string;
  status: DeviceStatus;
  type: string;
  lastSeen: string;
  metrics?: Record<string, number>;
}

// ─── Alert ─────────────────────────────────────────────────────────
import type { SeverityLevel, AlertStatus } from '@/constants';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: AlertStatus;
  deviceId: string;
  deviceName: string;
  location: string;
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
}

/**
 * Alert record exactly as returned by `GET /alerts` (`AlertResponse`).
 * Distinct from `Alert` above, which does not match the live backend
 * shape — use this type for any component that fetches real alert data.
 */
export interface AlertRecord {
  id: string;
  zone: string;
  alert_type: string;
  severity: SeverityLevel;
  source: string;
  message: string;
  generated_by: string;
  status: AlertStatus;
  generated_at: string;
  updated_at: string;
}

// ─── Incident (safety alert source) ───────────────────────────────
export type IncidentType = 'gas_leak' | 'fire' | 'explosion' | 'ppe_violation';

export interface Incident {
  id: string;
  zone: string;
  severity: SeverityLevel;
  incident_type: IncidentType;
  description: string;
  root_cause: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Permit-to-Work ────────────────────────────────────────────────
export type PermitType   = 'hot_work' | 'confined_space' | 'electrical';
export type PermitStatus = 'active' | 'closed' | 'suspended';

export interface Permit {
  id: string;
  permit_type: PermitType;
  zone: string;
  issued_by: string;
  assigned_team: string;
  start_time: string;
  end_time: string;
  status: PermitStatus;
  created_at: string;
  updated_at: string;
}

// ─── Worker ────────────────────────────────────────────────────────
export type WorkerStatus = 'working' | 'idle' | 'emergency';

export interface Worker {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  role: string;
  current_zone: string | null;
  ppe_status: boolean;
  shift: 'Morning' | 'Afternoon' | 'Night';
  status: WorkerStatus;
  created_at: string;
  updated_at: string;
}

// ─── Sensor Reading ────────────────────────────────────────────────
export type SensorType   = 'gas' | 'temperature' | 'pressure' | 'humidity';
export type SensorStatus = 'normal' | 'warning' | 'critical';

export interface SensorReading {
  id: string;
  zone: string;
  sensor_type: SensorType;
  value: number;
  unit: string;
  status: SensorStatus;
  timestamp: string;
}

// ─── Report ────────────────────────────────────────────────────────
export interface Report {
  id: string;
  title: string;
  type: string;
  generatedAt: string;
  generatedBy: string;
  status: 'pending' | 'ready' | 'failed';
  downloadUrl?: string;
}

// ─── Analytics ────────────────────────────────────────────────────
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface AnalyticsSummary {
  totalAlerts: number;
  activeAlerts: number;
  devicesOnline: number;
  devicesTotal: number;
  incidentRate: number;
  safetyScore: number;
  trend: 'up' | 'down' | 'stable';
}

// ─── Risk Summary ──────────────────────────────────────────────────
export interface RiskSummary {
  /** Overall risk score, 0-100. */
  score: number;
  /** Bucketed risk level derived from the score. */
  level: SeverityLevel;
  /** Direction of change since the previous reading. */
  trend: 'up' | 'down' | 'stable';
}

// ─── Compound Risk (POST /risk-scores/calculate) ───────────────────
export interface RiskFactorContribution {
  name: string;
  points: number;
  weight: number;
  detail: string;
}

export interface ZoneRiskResult {
  zone: string;
  score: number;
  risk_level: SeverityLevel;
  contributing_factors: RiskFactorContribution[];
}

export interface RiskScoreCalculationResult {
  zone_count: number;
  results: ZoneRiskResult[];
}

/** Overall risk status, derived client-side from `risk_level`. */
export type RiskStatus = 'safe' | 'warning' | 'critical';

// ─── Emergency Response (GET /emergency/actions) ───────────────────
export const EMERGENCY_ACTION_TYPES = [
  'notify_safety_officer',
  'notify_control_room',
  'stop_work',
  'isolate_equipment',
  'evacuate_area',
  'generate_incident',
] as const;
export type EmergencyActionType = (typeof EMERGENCY_ACTION_TYPES)[number];

export interface EmergencyActionMatch {
  action: EmergencyActionType;
  triggered_by_rule: string;
  explanation: string;
}

export interface ZoneEmergencyResponseResult {
  zone: string;
  risk_score: number;
  risk_level: SeverityLevel;
  actions: EmergencyActionMatch[];
  explanation: string;
}

export interface EmergencyResponseResult {
  zone_count: number;
  results: ZoneEmergencyResponseResult[];
}

/** A single dispatched action flattened for display, with its recommended dispatch order within its zone. */
export interface EmergencyActionItem {
  zone: string;
  risk_level: SeverityLevel;
  action: EmergencyActionType;
  triggered_by_rule: string;
  explanation: string;
  /** 1-based position in the recommended dispatch order for this zone, most urgent first. */
  order: number;
}

// ─── Emergency Status (GET /emergency/status) ───────────────────────
export interface ZoneEmergencyStatus {
  zone: string;
  risk_score: number;
  risk_level: SeverityLevel;
  action_count: number;
}

export interface EmergencyStatus {
  zone_count: number;
  in_emergency: boolean;
  zones: ZoneEmergencyStatus[];
}

/**
 * Plant-wide status banner state — derived client-side from two real
 * backend signals (never fabricated): `EmergencyStatus.in_emergency`
 * (an emergency action has actually been dispatched somewhere) takes
 * precedence; otherwise it buckets the Compound Risk engine's overall
 * `risk_level` for the highest-risk zone.
 */
export const PLANT_STATUSES = ['normal', 'warning', 'critical', 'emergency'] as const;
export type PlantStatus = (typeof PLANT_STATUSES)[number];

/** Aggregated compound risk assessment for the `CompoundRiskCard`. */
export interface CompoundRiskAssessment {
  /** Highest zone risk score, 0-100. */
  risk_score: number;
  /** Bucketed risk level of the highest-scoring zone. */
  risk_level: SeverityLevel;
  /** Total number of contributing-factor rules triggered across all zones. */
  triggered_rules_count: number;
  /** Overall status derived from `risk_level`. */
  status: RiskStatus;
}

/** A single triggered rule, backed 1:1 by a `RiskFactorContribution` returned by the engine. */
export interface TriggeredRule {
  name: string;
  detail: string;
}

/**
 * Explanation payload for the `RiskExplanationPanel`, built entirely from the
 * zone result the risk score engine returns — no text is generated client-side.
 */
export interface RiskExplanation {
  zone: string;
  risk_level: SeverityLevel;
  /** One entry per contributing factor the engine reports as triggered for this zone. */
  triggered_rules: TriggeredRule[];
  /**
   * Backend-authored free-text explanation for this assessment.
   * `null` when the backend has not recorded one — the panel must show an
   * empty state in that case rather than synthesising text.
   */
  explanation: string | null;
  /** Full contributing-factor detail (name, points, weight, detail) for this zone. */
  contributing_factors: RiskFactorContribution[];
}

/** Persisted risk score record exactly as returned by `GET /risk-scores` (`RiskScoreRead`). */
export interface RiskScoreRecord {
  id: string;
  zone: string;
  risk_score: number;
  risk_level: SeverityLevel;
  /** Flattened factor summary on persisted records — a string, not the structured list `/calculate` returns. */
  contributing_factors: string | null;
  recommendation: string | null;
  analyzed_at: string;
  updated_at: string;
}

// ─── Safety Timeline ────────────────────────────────────────────────
export type SafetyTimelineEventType =
  | 'sensor_threshold_crossed'
  | 'permit_expired'
  | 'worker_entered_zone'
  | 'compound_risk_generated';

/**
 * A single chronological entry for the `SafetyTimeline`. Built from real
 * backend records only — `GET /alerts` (grouped by `source`) for the first
 * three event types, `GET /risk-scores` for compound-risk entries.
 */
export interface SafetyTimelineEvent {
  id: string;
  type: SafetyTimelineEventType;
  /** Human-readable event label, e.g. "Sensor Threshold Crossed". */
  label: string;
  /** Backend-authored message/description for this event. */
  description: string;
  severity: SeverityLevel;
  /** ISO timestamp the backend recorded for this event. */
  timestamp: string;
  zone: string;
}

// ─── Dashboard Summary (GET /dashboard/summary) ────────────────────
export interface DashboardSummary {
  total_workers: number;
  active_workers: number;
  active_alerts: number;
  critical_alerts: number;
  active_permits: number;
  overall_risk_score: number | null;
  overall_risk_level: string | null;
}

// ─── Dashboard Full Payload (GET /dashboard) ───────────────────────
export interface ZoneSensorSummary {
  zone: string;
  normal_count: number;
  warning_count: number;
  critical_count: number;
  plant_status: 'Safe' | 'Warning' | 'Critical';
}

export interface DashboardPayload {
  summary: DashboardSummary;
  zones: ZoneSensorSummary[];
}

/** Aggregated plant-wide safety snapshot for the `PlantSafetyOverview`. */
export interface PlantSafetyOverview {
  total_workers: number;
  /** Sensors currently reporting a reading across all zones (normal + warning + critical). */
  active_sensors: number;
  active_permits: number;
  open_alerts: number;
  /** Bucketed current risk level, or `null` when no risk assessment has been recorded yet. */
  risk_level: SeverityLevel | null;
}

// ─── Compliance (GET /compliance/status) ───────────────────────────
export const COMPLIANCE_FRAMEWORKS = ['factory_act', 'oisd', 'dgms'] as const;
export type ComplianceFramework = (typeof COMPLIANCE_FRAMEWORKS)[number];

export const COMPLIANCE_STATUSES = ['compliant', 'non_compliant'] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export interface ComplianceStatusSnapshot {
  status: ComplianceStatus;
  incident_count: number;
  non_compliant_count: number;
  violated_frameworks: ComplianceFramework[];
}

// ─── Compliance Evaluation (POST /compliance/evaluate, GET /compliance/incidents/{id}) ───
export interface ComplianceViolation {
  rule_code: string;
  framework: ComplianceFramework;
  title: string;
  description: string;
  recommendation: string;
  citations: string[];
}

export interface IncidentComplianceResult {
  incident_id: string;
  status: ComplianceStatus;
  violated_frameworks: ComplianceFramework[];
  violations: ComplianceViolation[];
  recommendations: string[];
}

// ─── Recommendations (GET /recommendations) ────────────────────────
export const RECOMMENDATION_SOURCES = ['compound_risk', 'emergency_response', 'compliance'] as const;
export type RecommendationSource = (typeof RECOMMENDATION_SOURCES)[number];

export interface Recommendation {
  source: RecommendationSource;
  zone: string | null;
  /** Sort key from the backend — lower sorts first (higher priority). Never re-sorted client-side. */
  priority: number;
  message: string;
  reason: string;
}

export interface RecommendationResult {
  recommendation_count: number;
  recommendations: Recommendation[];
}

// ─── Incident Report (GET /incident-reports/{incident_id}) ─────────
export interface ReportSummary {
  incident_id: string;
  zone: string;
  incident_type: IncidentType;
  severity: SeverityLevel;
  description: string;
  root_cause: string | null;
}

export interface TimelineEvent {
  timestamp: string;
  label: string;
  description: string;
}

export interface DetectedRisk {
  zone: string;
  risk_score: number;
  risk_level: SeverityLevel;
  explanation: string;
}

export interface TriggeredRule {
  rule_name: string;
  points: number;
  explanation: string;
}

export interface EmergencyActionEntry {
  action: EmergencyActionType;
  triggered_by_rule: string;
  explanation: string;
}

export interface ComplianceNote {
  rule_code: string;
  framework: ComplianceFramework;
  title: string;
  description: string;
  recommendation: string;
}

export interface IncidentReportData {
  summary: ReportSummary;
  timeline: TimelineEvent[];
  detected_risks: DetectedRisk[];
  triggered_rules: TriggeredRule[];
  emergency_actions: EmergencyActionEntry[];
  compliance_notes: ComplianceNote[];
  compliance_status: ComplianceStatus | null;
}

// ─── Navigation ────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  path: string;
  icon?: React.ElementType;
  badge?: string | number;
  children?: NavItem[];
}

// ─── UI Helpers ────────────────────────────────────────────────────
export type Size    = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
