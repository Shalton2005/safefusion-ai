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
